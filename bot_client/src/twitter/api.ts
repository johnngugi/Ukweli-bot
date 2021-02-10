import axios, {AxiosRequestConfig, AxiosResponse} from 'axios';
import {
  PredictionResponse,
  RuleResponse,
  StreamResponse,
  User,
  UserResponse,
} from 'responses';
import OAuth from 'oauth-1.0a';
import * as crypto from 'crypto';
import {Readable} from 'stream';
import httpAdapter from 'axios/lib/adapters/http';
import url from 'url';
import logger from '../util/logger';
import getArticle from '../util/articles';

import {
  BEARER_TOKEN,
  TWITTER_ACCESS_SECRET,
  TWITTER_ACCESS_TOKEN,
  TWITTER_API_KEY,
  TWITTER_API_SECRET,
} from '../util/secrets';
import {getReferencedTweet} from './utils';

interface Errors {
  name: string;
  message: string;
  stack?: string;
  code?: string;
}

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
const bot_base_url = `http://${process.env.BOT_API_HOST}`;

const APIv2 = axios.create({
  baseURL: base_url_v2,
  headers: {Authorization: `Bearer ${BEARER_TOKEN}`},
});

const APIv1 = axios.create({
  baseURL: base_url_v1,
});

const botApi = axios.create({
  baseURL: bot_base_url,
});

const streamURLv2 = '/tweets/search/stream';
const rulesURLv2 = '/tweets/search/stream/rules';

const usersURLv2 = '/users';

const statusesUpdatev1 = '/statuses/update.json';

const rnnInferenceUrl = '/v1/inference/rnn_model';

const rules = [{value: '@JohnNgu19909134 OR #JohnNgu19909134'}];

async function setRules(): Promise<RuleResponse> {
  const data = {
    add: rules,
  };

  return (await APIv2.post<RuleResponse>(rulesURLv2, data)).data;
}

function typeFromScore(score: number): boolean {
  return score < 0.5;
}

async function updateStatus(
  score: number,
  reply_to_username: string,
  reply_to_id: string
) {
  const truthiness = typeFromScore(score);
  const status = `@${reply_to_username}. This tweet has been classifed as: ${truthiness} with a certainty of ${score}`;

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

  return APIv1.post(statusesUpdatev1, new url.URLSearchParams(data), {
    headers: oauth.toHeader(oauth.authorize(request_data, token)),
  });
}

async function predictionApi(
  parameters: object
): Promise<AxiosResponse<PredictionResponse>> {
  return botApi.post(rnnInferenceUrl, {
    data: parameters,
  });
}

async function getReferencedUser(userId: string): Promise<User> {
  const params = {
    ids: userId,
    'user.fields': 'verified,public_metrics',
  };

  const options: AxiosRequestConfig = {
    params: params,
  };

  return (await APIv2.get<UserResponse>(usersURLv2, options)).data.data[0];
}

async function processStreamInput(json: StreamResponse) {
  try {
    logger.info('%o', json);

    // process tweet to create input data for model prediction
    const referenced_tweet = getReferencedTweet(json);
    const likes = referenced_tweet!.public_metrics.like_count;
    const retweets = referenced_tweet!.public_metrics.retweet_count;

    const user = await getReferencedUser(referenced_tweet!.author_id);
    const followers = user.public_metrics.followers_count;
    const following = user.public_metrics.following_count;
    const statuses = user.public_metrics.tweet_count;

    let text;
    if ('urls' in referenced_tweet!.entities) {
      // Use page text as input
      const url = referenced_tweet!.entities.urls[0].url;
      text = await getArticle(url);
      logger.info('article: ' + url);
    } else {
      // Use tweet text as input
      text = referenced_tweet!.text;
    }

    let verified = json.includes.users[0].verified.toString();
    verified = verified[0].toUpperCase() + verified.slice(1);

    let isQuoteStatus;
    if ('referenced_tweets' in referenced_tweet!) {
      isQuoteStatus = json.data.referenced_tweets
        .some(element => {
          return element.type === 'quoted';
        })
        .toString();
      isQuoteStatus = isQuoteStatus[0].toUpperCase() + isQuoteStatus.slice(1);
    }

    isQuoteStatus = 'False';

    const reply_to_id = json.data.id;
    const reply_to_username = json.includes.users[0].username;

    // call model api
    const modelParams = {
      favorites_median: likes,
      retweets_median: retweets,
      followers_median: followers,
      friends_median: following,
      statuses_median: statuses,
      is_quote_status: isQuoteStatus,
      verified: verified,
      text: text,
    };

    try {
      const score = await callModelApi(modelParams);
      logger.info('Classification given: ' + score);

      await updateStatus(score, reply_to_username, reply_to_id);
      logger.info(`status update for user ${reply_to_username} ${reply_to_id}`);
    } catch (error) {
      logger.error('Prediction api error');
      logger.error(error.message + '\n' + error.stack);
    }
  } catch (e) {
    if ('response' in e) {
      logger.error(e.config.url);
      logger.error(e.config.method);
    }
    logger.error(e.message + '\n' + e.stack);
  }
}

async function callModelApi(modelParams: {
  favorites_median: number;
  retweets_median: number;
  followers_median: number;
  friends_median: number;
  statuses_median: number;
  is_quote_status: string;
  verified: string;
  text: string;
}): Promise<number> {
  logger.info('Model params: %o', modelParams);
  const predictionApiCall = (await predictionApi(modelParams)).data;
  return predictionApiCall.predictions[0];
}

async function streamConnect(): Promise<Readable> {
  const params = {
    'tweet.fields': 'author_id,public_metrics,referenced_tweets,entities',
    expansions: 'referenced_tweets.id,author_id',
    'user.fields': 'public_metrics,verified',
  };

  const options: AxiosRequestConfig = {
    timeout: 20000,
    responseType: 'stream',
    adapter: httpAdapter,
    params: params,
  };

  const response = await APIv2.get<Readable>(streamURLv2, options);
  const stream = response.data;

  //Listen to the stream
  stream
    .on('data', data => {
      try {
        const json = JSON.parse(data);
        processStreamInput(json);
      } catch (error) {
        logger.info('data keep-alive');
      }
    })
    .on('error', (error: Errors) => {
      if (error.code === 'ETIMEDOUT') {
        stream.emit('timeout');
      }
    });

  return stream;
}

export {streamConnect, setRules};
