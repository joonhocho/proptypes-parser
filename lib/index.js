'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

/*
export const propTypes = {
  profile: PropTypes.shape({
    profileInfo: PropTypes.shape({
      name: PropTypes.shape({
        name: PropTypes.string.isRequired,
      }),
      picture: PropTypes.shape({
        path: PropTypes.string.isRequired,
      }),
      company: PropTypes.shape({
        name: PropTypes.string.isRequired,
      }),
    }).isRequired,
  }).isRequired,
};
*/

var STATE_NEED_NAME = 'need_name';
var STATE_NEED_NAME_COLON = 'need_name_colon';
var STATE_NEED_TYPE = 'need_type';
var STATE_SEEN_TYPE = 'seen_type';

var CHAR_COLON = ':';
var CHAR_REQUIRED = '!';
var CHAR_LIST_OPEN = '[';
var CHAR_LIST_CLOSE = ']';
var CHAR_SHAPE_OPEN = '{';
var CHAR_SHAPE_CLOSE = '}';

var punctuatorRegexp = /([\!\(\)\:\[\]\{\}])/g;

// https://facebook.github.io/graphql/#sec-Names
var nameRegexp = /[_A-Za-z][_0-9A-Za-z]*/;

var isValidName = function isValidName(name) {
  return nameRegexp.test(name);
};

var last = function last(list) {
  return list[list.length - 1];
};

var createContext = function createContext() {
  var overrides = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];
  return _extends({
    scope: {},
    state: STATE_NEED_NAME,
    name: null,
    type: null,
    openingChar: null
  }, overrides);
};

var getInnerTokens = function getInnerTokens(tokens, opening, closing) {
  var start = arguments.length <= 3 || arguments[3] === undefined ? 0 : arguments[3];

  var level = 0;
  for (var i = start; i < tokens.length; i++) {
    var token = tokens[i];
    if (token === opening) {
      level++;
    } else if (token === closing) {
      if (!level) {
        return tokens.slice(start, i);
      }
      level--;
    }
  }
  throw new Error('No closing char is found. char=' + closing);
};

exports.default = function (PropTypes, extension) {
  if (!PropTypes) {
    throw new Error('Must provide React.PropTypes.');
  }

  var types = {
    Array: PropTypes.array,
    Boolean: PropTypes.bool,
    Function: PropTypes.func,
    Number: PropTypes.number,
    Object: PropTypes.object,
    String: PropTypes.string,
    Node: PropTypes.node,
    Element: PropTypes.element,
    Any: PropTypes.any,
    Date: PropTypes.instanceOf(Date),
    RegExp: PropTypes.instanceOf(RegExp)
  };

  if (extension) {
    Object.keys(extension).forEach(function (name) {
      var type = extension[name];
      if (typeof type === 'function') {
        types[name] = PropTypes.instanceOf(type);
      } else {
        types[name] = type;
      }
    });
  }

  var getType = function getType(name) {
    if (types[name]) return types[name];
    throw new Error('Expected valid named type. Instead, saw \'' + name + '\'.');
  };

  var parseType = function parseType(tokens) {
    var isRequired = last(tokens) === CHAR_REQUIRED;
    if (isRequired) {
      tokens = tokens.slice(0, tokens.length - 1);
    }

    var innerTokens = void 0;
    var type = void 0;
    switch (tokens[0]) {
      case CHAR_LIST_OPEN:
        if (last(tokens) !== CHAR_LIST_CLOSE) {
          throw new Error('Expected to end with ' + CHAR_LIST_CLOSE + '. Instead, saw \'' + last(tokens) + '\'. ' + tokens);
        }

        innerTokens = getInnerTokens(tokens, CHAR_LIST_OPEN, CHAR_LIST_CLOSE, 1);
        if (innerTokens.length + 2 !== tokens.length) {
          throw new Error('Invalid wrapping with ' + CHAR_LIST_OPEN + ' ' + CHAR_LIST_CLOSE + '. ' + tokens);
        }

        type = PropTypes.arrayOf(parseType(innerTokens));
        break;

      case CHAR_SHAPE_OPEN:
        if (last(tokens) !== CHAR_SHAPE_CLOSE) {
          throw new Error('Expected to end with ' + CHAR_SHAPE_CLOSE + '. Instead, saw \'' + last(tokens) + '\'. ' + tokens);
        }

        innerTokens = getInnerTokens(tokens, CHAR_SHAPE_OPEN, CHAR_SHAPE_CLOSE, 1);
        if (innerTokens.length + 2 !== tokens.length) {
          throw new Error('Invalid wrapping with ' + CHAR_SHAPE_OPEN + ' ' + CHAR_SHAPE_CLOSE + '. ' + tokens);
        }

        type = PropTypes.shape(parseShape(innerTokens));
        break;

      default:
        if (tokens.length !== 1) {
          throw new Error('Invalid type name. ' + tokens);
        }
        type = getType(tokens[0]);
        break;
    }

    if (isRequired && !type.isRequired) {
      throw new Error('Type does support isRequired. ' + tokens);
    }
    return isRequired ? type.isRequired : type;
  };

  var parseShape = function parseShape(tokens) {
    if (!tokens.length) {
      throw new Error('Empty shape.');
    }

    var shape = {};

    var state = STATE_NEED_NAME;
    var name = null;
    for (var i = 0; i < tokens.length; i++) {
      var token = tokens[i];
      var innerTokens = void 0;

      switch (state) {

        case STATE_NEED_NAME:
          if (!isValidName(token)) {
            throw new Error('Expected valid name. Instead, saw \'' + token + '\'.');
          }
          name = token;
          state = STATE_NEED_NAME_COLON;
          break;

        case STATE_NEED_NAME_COLON:
          if (token !== CHAR_COLON) {
            throw new Error('Expected colon after name=\'' + name + '\'. Instead, saw \'' + token + '\'.');
          }
          state = STATE_NEED_TYPE;
          break;

        case STATE_NEED_TYPE:
          switch (token) {
            case CHAR_LIST_OPEN:
              // List / PropTypes.arrayOf
              // Enum / PropTypes.oneOf
              innerTokens = getInnerTokens(tokens, CHAR_LIST_OPEN, CHAR_LIST_CLOSE, i + 1);
              shape[name] = PropTypes.arrayOf(parseType(innerTokens));
              i += innerTokens.length + 1;
              break;

            case CHAR_SHAPE_OPEN:
              // Object / PropTypes.object / PropTypes.objectOf
              innerTokens = getInnerTokens(tokens, CHAR_SHAPE_OPEN, CHAR_SHAPE_CLOSE, i + 1);
              shape[name] = PropTypes.shape(parseShape(innerTokens));
              i += innerTokens.length + 1;
              break;

            default:
              shape[name] = getType(token);
              break;
          }

          state = STATE_SEEN_TYPE;
          break;

        case STATE_SEEN_TYPE:
          switch (token) {
            case CHAR_REQUIRED:
              // Non-Null / PropTypes.isRequired
              if (!shape[name].isRequired) {
                throw new Error('Type does support isRequired. name=' + name);
              }
              shape[name] = shape[name].isRequired;
              state = STATE_NEED_NAME;
              break;

            /*
            TODO: Support Union
            case '|':
              // Union / PropTypes.oneOfType
              break;
            */

            default:
              state = STATE_NEED_NAME;
              i--;
              break;
          }
          break;

        default:
          throw new Error('Unknown state. state=' + state);
      }
    }

    if (state === STATE_NEED_NAME_COLON || state === STATE_NEED_TYPE) {
      throw new Error('Incomplete shape. ' + tokens);
    }

    return shape;
  };

  return function (string) {
    var tokens = string.replace(punctuatorRegexp, ' $1 ').split(/[\n\s,;]+/g).filter(function (x) {
      return x;
    });
    if (tokens[0] !== CHAR_SHAPE_OPEN || last(tokens) !== CHAR_SHAPE_CLOSE) {
      throw new Error('Must start with wrap definition with { }.');
    }

    return parseShape(tokens.slice(1, tokens.length - 1));
  };
};