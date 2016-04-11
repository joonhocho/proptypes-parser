let createParser;
if (process && process.env && process.env.NODE_ENV === 'production') {
  // No-op if production
  createParser = () => () => ({});
} else {
  createParser = require('./parser.js').default;
}

export default createParser;
