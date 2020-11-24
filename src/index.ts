const needle = require('needle');

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

interface Tweet {
  id: string;
  text: string;
}

const token = process.env.BEARER_TOKEN;
const rulesURL = 'https://api.twitter.com/2/tweets/search/stream/rules';
const streamURL = 'https://api.twitter.com/2/tweets/search/stream';

const rules = [{value: '@JohnNgu19909134 OR #JohnNgu19909134'}];

async function setRules() {
  const data = {
    add: rules,
  };

  const response = await needle('post', rulesURL, data, {
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
  });

  if (response.statusCode !== 201) {
    throw new Error(response.body);
  }

  return response.body;
}

function streamConnect() {
  //Listen to the stream
  const options = {
    timeout: 20000,
  };

  const stream = needle.get(
    streamURL,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    options
  );

  stream
    .on('data', (data: string) => {
      try {
        const json = JSON.parse(data);
        console.log(json);
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
  // let currentRules;

  try {
    // Gets the complete list of rules currently applied to the stream
    // currentRules = await getAllRules();

    // Delete all rules. Comment the line below if you want to keep your existing rules.
    // await deleteAllRules(currentRules);

    // Add rules to the stream. Comment the line below if you don't want to add new rules.
    await setRules();
  } catch (e) {
    console.error(e);
    // process.exit(-1);
  }

  // Listen to the stream.
  // This reconnection logic will attempt to reconnect when a disconnection is detected.
  // To avoid rate limites, this logic implements exponential backoff, so the wait time
  // will increase if the client cannot reconnect to the stream.

  const filteredStream = streamConnect();
  let timeout = 0;
  filteredStream.on('timeout', () => {
    // Reconnect on error
    console.warn('A connection error occurred. Reconnecting…');
    setTimeout(() => {
      timeout++;
      streamConnect();
    }, 2 ** timeout);
    streamConnect();
  });
})();
