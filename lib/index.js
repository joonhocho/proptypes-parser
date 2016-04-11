'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
var createParser = void 0;
if (process && process.env && process.env.NODE_ENV === 'production') {
  // No-op if production
  createParser = function createParser() {
    return function () {
      return {};
    };
  };
} else {
  createParser = require('./parser.js').default;
}

exports.default = createParser;