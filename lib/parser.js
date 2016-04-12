'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _GROUPS;

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

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
var CHAR_GROUP_OPEN = '(';
var CHAR_GROUP_CLOSE = ')';
var CHAR_QUOTE_OPEN = "'";
var CHAR_QUOTE_CLOSE = "'";

var GROUPS = (_GROUPS = {}, _defineProperty(_GROUPS, CHAR_LIST_OPEN, {
  type: 'LIST',
  opening: CHAR_LIST_OPEN,
  closing: CHAR_LIST_CLOSE
}), _defineProperty(_GROUPS, CHAR_SHAPE_OPEN, {
  type: 'SHAPE',
  opening: CHAR_SHAPE_OPEN,
  closing: CHAR_SHAPE_CLOSE
}), _defineProperty(_GROUPS, CHAR_GROUP_OPEN, {
  type: 'GROUP',
  opening: CHAR_GROUP_OPEN,
  closing: CHAR_GROUP_CLOSE
}), _defineProperty(_GROUPS, CHAR_QUOTE_OPEN, {
  type: 'QUOTE',
  opening: CHAR_QUOTE_OPEN,
  closing: CHAR_QUOTE_CLOSE
}), _GROUPS);

var OPERATOR_SPREAD = '...';

var punctuatorRegexp = /([\!\(\)\:\[\]\{\}\'\,])/g;
// https://facebook.github.io/graphql/#sec-Names
var nameRegexp = /[_A-Za-z][_0-9A-Za-z]*/;
var spreadRegexp = /^\.\.\./;

var isValidName = function isValidName(name) {
  return nameRegexp.test(name);
};
var last = function last(list) {
  return list[list.length - 1];
};
var forEach = function forEach(obj, fn) {
  return Object.keys(obj).forEach(function (name) {
    return fn(obj[name], name, obj);
  });
};

var getInnerTokens = function getInnerTokens(tokens, opening, closing) {
  var start = arguments.length <= 3 || arguments[3] === undefined ? 0 : arguments[3];

  var level = 0;
  for (var i = start; i < tokens.length; i++) {
    var token = tokens[i];
    if (token === closing) {
      if (!level) {
        return tokens.slice(start, i);
      }
      level--;
    } else if (token === opening) {
      level++;
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

  var maybeConvertClassToType = function maybeConvertClassToType(type) {
    if (typeof type === 'function' && type.prototype) {
      return PropTypes.instanceOf(type);
    }
    return type;
  };

  var addTypes = function addTypes(dest, typeOverrides) {
    forEach(typeOverrides, function (type, name) {
      dest[name] = maybeConvertClassToType(type);
    });
  };

  if (extension) addTypes(types, extension);

  var tmpTypes = {};

  var getType = function getType(name) {
    if (tmpTypes[name]) return tmpTypes[name];
    if (types[name]) return types[name];
    throw new Error('Expected valid named type. Instead, saw \'' + name + '\'.');
  };

  var buildTree = function buildTree(tokens) {
    var node = {
      children: []
    };
    for (var i = 0; i < tokens.length; i++) {
      var token = tokens[i];
      var child = void 0;
      if (GROUPS[token]) {
        var group = GROUPS[token];
        var innerTokens = getInnerTokens(tokens, token, group.closing, i + 1);
        child = _extends({}, group, buildTree(innerTokens));
        i += innerTokens.length + 1;
      } else {
        child = {
          type: 'LEAF',
          token: token
        };
      }
      node.children.push(child);
    }
    return node;
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
      throw new Error('Type does not support isRequired. ' + tokens);
    }
    return isRequired ? type.isRequired : type;
  };

  var parseShape = function parseShape(tokens) {
    if (!tokens.length) throw new Error('Empty shape.');

    var shape = {};

    var state = STATE_NEED_NAME;
    var name = null;
    for (var i = 0; i < tokens.length; i++) {
      var token = tokens[i];
      var innerTokens = void 0;

      switch (state) {

        case STATE_NEED_NAME:
          if (spreadRegexp.test(token)) {
            name = token.substring(3);
            if (!namedPropTypes[name]) {
              throw new Error('Unknown type to spread. name=' + name);
            }

            forEach(namedPropTypes[name], function (value, key) {
              return shape[key] = value;
            });
            state = STATE_NEED_NAME;
          } else {
            if (!isValidName(token)) {
              throw new Error('Expected valid name. Instead, saw \'' + token + '\'.');
            }

            name = token;
            state = STATE_NEED_NAME_COLON;
          }
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

  var namedPropTypes = {};

  var addPropTypes = function addPropTypes(name, propTypes) {
    if (types[name]) {
      throw new Error('\'' + name + '\' type is already defined.');
    }
    namedPropTypes[name] = propTypes;
    types[name] = PropTypes.shape(propTypes);
  };

  var parser = function parser(string, typeOverrides) {
    var tokens = string.replace(punctuatorRegexp, ' $1 ').split(/[\n\s,;]+/g).filter(function (x) {
      return x;
    });

    console.log('tokens', tokens.join(' '));
    console.log(JSON.stringify(buildTree(tokens), null, '  '));

    var name = void 0;
    if (isValidName(tokens[0])) {
      name = tokens[0];
      tokens = tokens.slice(1);
    }

    if (tokens[0] !== CHAR_SHAPE_OPEN || last(tokens) !== CHAR_SHAPE_CLOSE) {
      throw new Error('Must wrap definition with { }.');
    }

    tmpTypes = {};
    if (typeOverrides) addTypes(tmpTypes, typeOverrides);

    if (types[name] || tmpTypes[name]) {
      throw new Error('\'' + name + '\' type is already defined.');
    }

    var propTypes = parseShape(tokens.slice(1, tokens.length - 1));

    if (name) addPropTypes(name, propTypes);

    return propTypes;
  };

  parser.getType = function (name) {
    return types[name] || null;
  };

  parser.getPropTypes = function (name) {
    return namedPropTypes[name] || null;
  };

  parser.addType = function (name, type) {
    if (types[name]) {
      throw new Error('\'' + name + '\' type is already defined.');
    }
    if (type.constructor === Object) {
      addPropTypes(name, type);
    } else {
      types[name] = maybeConvertClassToType(type);
    }
  };

  return parser;
};