import {StreamResponse} from 'responses';

export function getReferencedTweet(json: StreamResponse) {
  const ref_tweet_id = json.data.referenced_tweets.find(
    tweet => tweet.type === 'replied_to' || tweet.type === 'quoted'
  );
  return json.includes.tweets.find(tweet => tweet.id === ref_tweet_id!.id);
}
