import axios, {AxiosRequestConfig} from 'axios';
import httpAdapter from 'axios/lib/adapters/http';
import OAuth from 'oauth-1.0a';
import {RuleResponse, StreamResponse} from 'responses';
import {Readable} from 'stream';
import logger from './util/logger';
import * as crypto from 'crypto';
import {
  BEARER_TOKEN,
  TWITTER_ACCESS_SECRET,
  TWITTER_ACCESS_TOKEN,
  TWITTER_API_KEY,
  TWITTER_API_SECRET,
} from './util/secrets';

const oauth = new OAuth({
  consumer: {
    key: TWITTER_API_KEY!,
    secret: TWITTER_API_SECRET!,
  },
  signature_method: 'HMAC_SHA1',
  hash_function: (base_string: string, key: string): string => {
    return crypto.createHmac('sha1', key).update(base_string).digest('base64');
  },
});

const base_url_v2 = 'https://api.twitter.com/2/';
const base_url_v1 = 'https://api.twitter.com/1.1/';

const APIv2 = axios.create({
  baseURL: base_url_v2,
  headers: {Authorization: `Bearer ${BEARER_TOKEN}`},
});

const APIv1 = axios.create({
  baseURL: base_url_v1,
});

const rulesURLv2 = '/tweets/search/stream/rules';
const streamURLv2 = '/tweets/search/stream';

const statusesUpdatev1 = '/statuses/update.json';

const rules = [{value: '@JohnNgu19909134 OR #JohnNgu19909134'}];

async function setRules(): Promise<RuleResponse> {
  const data = {
    add: rules,
  };

  return (await APIv2.post<RuleResponse>(rulesURLv2, data)).data;
}

function typeFromClassNumber(classNumber: number): string {
  //TODO: return classification based on threshold
  return 'False';
}

async function updateStatus(
  newsType: string,
  reply_to_username: string,
  reply_to_id: string
) {
  const status = `@${reply_to_username}. This tweet has been classifed as: ${newsType} `;

  const data = {
    status: status,
    in_reply_to_status_id: reply_to_id,
  };

  const request_data = {
    url: `${base_url_v1.slice(0, -1)}${statusesUpdatev1}`,
    method: 'POST',
    data: data,
  };

  const token = {
    key: TWITTER_ACCESS_TOKEN!,
    secret: TWITTER_ACCESS_SECRET!,
  };

  return APIv1.post(statusesUpdatev1, {
    data: data,
    headers: oauth.toHeader(oauth.authorize(request_data, token)),
  });
}

async function processStreamInput(data: string) {
  try {
    const json: StreamResponse = JSON.parse(data);
    logger.debug(json);

    // process tweet to create input data for model prediction
    const likes = json.data.public_metrics.like_count;
    const retweets = json.data.public_metrics.retweet_count;
    const followers = json.includes.users[0].public_metrics.followers_count;
    const following = json.includes.users[0].public_metrics.following_count;
    const quote_count = json.data.public_metrics.quote_count;
    const text = json.data.text;

    let verified = json.includes.users[0].verified.toString();
    verified = verified[0].toUpperCase() + verified.slice(1);

    let isQuoteStatus = json.data.referenced_tweets
      .some(element => {
        return element.type === 'quoted';
      })
      .toString();
    isQuoteStatus = isQuoteStatus[0].toUpperCase() + isQuoteStatus.slice(1);

    const reply_to_id = json.includes.users[0].id;
    const reply_to_username = json.includes.users[0].username;

    // predict
    // call model api
    const classification = typeFromClassNumber(1);

    // send prediction as reply/direct message to sender
    await updateStatus(classification, reply_to_username, reply_to_id);
  } catch (e) {
    // Keep alive signal received. Do nothing.
  }
}

async function streamConnect(): Promise<Readable> {
  const options: AxiosRequestConfig = {
    timeout: 20000,
    responseType: 'stream',
    adapter: httpAdapter,
  };

  const response = await APIv2.get<Readable>(streamURLv2, options);
  const stream = response.data;

  //Listen to the stream
  stream.on('data', processStreamInput).on('error', (error: {code: string}) => {
    if (error.code === 'ETIMEDOUT') {
      stream.emit('timeout');
    }
  });

  return stream;
}

(async () => {
  try {
    // Add rules to the stream. Comment the line below if you don't want to add new rules.
    await setRules();
  } catch (e) {
    logger.error(e);
  }

  // Listen to the stream.
  // This reconnection logic will attempt to reconnect when a disconnection is detected.
  // To avoid rate limites, this logic implements exponential backoff, so the wait time
  // will increase if the client cannot reconnect to the stream.
  let filteredStream;
  let timeout = 0;
  try {
    filteredStream = await streamConnect();
    filteredStream.on('timeout', () => {
      // Reconnect on error
      logger.warn('A connection error occurred. Reconnecting…');
      setTimeout(() => {
        timeout++;
        streamConnect();
      }, 2 ** timeout);
      streamConnect();
    });
  } catch (error) {
    logger.error(error);
  }
})();
