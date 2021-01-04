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
  const stream = await streamConnect();
  let timeout = 0;
  stream.on('timeout', () => {
    logger.warn('A connection error occurred. Reconnecting…');
    timeout++;
    reconnect(timeout);
  });
}

streamTweets();
