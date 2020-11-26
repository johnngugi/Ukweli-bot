import axios, {AxiosRequestConfig} from 'axios';
import httpAdapter from 'axios/lib/adapters/http';
import {Readable} from 'stream';
import logger from './util/logger';
import {BEARER_TOKEN} from './util/secrets';

interface Rule {
  value: string;
  id: string;
  tag: string;
}

interface RuleResponse {
  data: Rule[];
  meta: {
    sent: string;
    summary: {
      created: number;
      not_created: number;
      valid: number;
      invalid: number;
    };
  };
}

// interface Tweet {
//   id: string;
//   text: string;
// }

const base_url_v2 = 'https://api.twitter.com/2/';

const APIv2 = axios.create({
  baseURL: base_url_v2,
  headers: {Authorization: `Bearer ${BEARER_TOKEN}`},
});

const rulesURLv2 = '/tweets/search/stream/rules';
const streamURLv2 = '/tweets/search/stream';

const rules = [{value: '@JohnNgu19909134 OR #JohnNgu19909134'}];

async function setRules(): Promise<RuleResponse> {
  const data = {
    add: rules,
  };

  return (await APIv2.post<RuleResponse>(rulesURLv2, data)).data;
}

async function streamConnect(): Promise<Readable> {
  //Listen to the stream
  const options: AxiosRequestConfig = {
    timeout: 20000,
    responseType: 'stream',
    adapter: httpAdapter,
  };

  const response = await APIv2.get<Readable>(streamURLv2, options);
  const stream = response.data;

  stream
    .on('data', (data: string) => {
      try {
        const json = JSON.parse(data);
        logger.debug(json);
      } catch (e) {
        // Keep alive signal received. Do nothing.
      }
    })
    .on('error', (error: {code: string}) => {
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

  const filteredStream = await streamConnect();
  let timeout = 0;
  filteredStream.on('timeout', () => {
    // Reconnect on error
    logger.warn('A connection error occurred. Reconnecting…');
    setTimeout(() => {
      timeout++;
      streamConnect();
    }, 2 ** timeout);
    streamConnect();
  });
})();
