import {extract} from 'article-parser';
import {stripHtml} from 'string-strip-html';
import logger from './logger';

async function getArticle(url: string): Promise<string> {
  try {
    const article = await extract(url);
    return getTextFromHtml(article.content!);
  } catch (error) {
    logger.error(error.message);
  }

  return 'no text was parsed';
}

function getTextFromHtml(htmlText: string): string {
  return stripHtml(htmlText).result;
}

export default getArticle;
