export type StreamFilterRule = {
  value: string;
  id: string;
  tag: string;
};

export type RuleResponse = {
  data: StreamFilterRule[];
  meta: {
    sent: string;
    summary: {
      created: number;
      not_created: number;
      valid: number;
      invalid: number;
    };
  };
};

// interface Tweet {
//   id: string;
//   text: string;
// }

export type public_metrics_tweet = {
  retweet_count: number;
  reply_count: number;
  like_count: number;
  quote_count: number;
};

export type public_metrics_user = {
  followers_count: number;
  following_count: number;
  tweet_count: number;
  listed_count: number;
};

export type user_expansion = {
  public_metrics: public_metrics_user;
  verified: boolean;
  username: string;
  name: string;
  id: string;
};

export type StreamResponse = {
  data: {
    text: string;
    id: string;
    public_metrics: public_metrics_tweet;
    referenced_tweets: [
      {
        type: string;
        id: string;
      }
    ];
  };
  includes: {
    users: user_expansion[];
  };
};

export type PredictionResponse = {
  predictions: number[];
};
