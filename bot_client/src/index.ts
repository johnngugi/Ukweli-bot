import logger from './util/logger';
import {streamConnect} from './twitter/api';

async function sleep(delay: number) {
  return new Promise(resolve => setTimeout(() => resolve(true), delay));
}

async function reconnect(timeout: number) {
  // stream.destroy();
  await sleep(2 ** timeout * 1000);
  await streamConnect();
}

async function streamTweets() {
  let timeout = 0;
  try {
    const stream = await streamConnect();
    stream.on('timeout', () => {
      logger.warn('Connection timeout. Reconnecting...');
      timeout++;
      reconnect(timeout);
    });
  } catch (error) {
    if ('response' in error) {
      if (error.response.status === 429) {
        logger.error('Too many requests.');
      }
    }
  }
}

streamTweets();
