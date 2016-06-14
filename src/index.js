import {PropTypes} from 'react';


let createParser;
if (process && process.env && process.env.NODE_ENV === 'production') {
  // No-op if production
  createParser = () => () => ({});
} else {
  createParser = require('./parser.js').default;
}


const parsePropTypes = createParser(PropTypes);
const PT = parsePropTypes.PT;


export {
  PropTypes,
  parsePropTypes,
  PT,
};

export default createParser;
