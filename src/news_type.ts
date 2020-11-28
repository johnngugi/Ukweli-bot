import * as tensorflow from '@tensorflow/tfjs-node';
import logger from './util/logger';

async function predictSample(sample: tensorflow.Tensor) {
  logger.debug('calling predictSample on', sample);
}
