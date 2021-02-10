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

export type Tweet = {
  id: string;
  text: string;
  public_metrics: public_metrics_tweet;
  entities: {
    urls: [
      {
        url: string;
        expanded_url: string;
      }
    ];
  };
  referenced_tweets: [
    {
      type: string;
      id: string;
    }
  ];
  author_id: string;
};

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

export type User = {
  username: string;
  public_metrics: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
    listed_count: number;
  };
  verified: boolean;
  id: string;
  name: string;
};

export type UserResponse = {
  data: User[];
};

export type StreamResponse = {
  data: Tweet;
  includes: {
    users: User[];
    tweets: Tweet[];
  };
};

export type PredictionResponse = {
  predictions: number[];
};
