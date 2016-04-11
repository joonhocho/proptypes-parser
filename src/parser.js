const STATE_NEED_NAME = 'need_name';
const STATE_NEED_NAME_COLON = 'need_name_colon';
const STATE_NEED_TYPE = 'need_type';
const STATE_SEEN_TYPE = 'seen_type';

const CHAR_COLON = ':';
const CHAR_REQUIRED = '!';
const CHAR_LIST_OPEN = '[';
const CHAR_LIST_CLOSE = ']';
const CHAR_SHAPE_OPEN = '{';
const CHAR_SHAPE_CLOSE = '}';
const OPERATOR_SPREAD = '...';

const punctuatorRegexp = /([\!\(\)\:\[\]\{\}])/g;
// https://facebook.github.io/graphql/#sec-Names
const nameRegexp = /[_A-Za-z][_0-9A-Za-z]*/;
const spreadRegexp = /^\.\.\./;

const isValidName = (name) => nameRegexp.test(name);
const last = (list) => list[list.length - 1];
const forEach = (obj, fn) => Object.keys(obj).forEach((name) => fn(obj[name], name, obj));

const getInnerTokens = (tokens, opening, closing, start = 0) => {
  let level = 0;
  for (let i = start; i < tokens.length; i++) {
    const token = tokens[i];
    if (token === opening) {
      level++;
    } else if (token === closing) {
      if (!level) {
        return tokens.slice(start, i);
      }
      level--;
    }
  }
  throw new Error(`No closing char is found. char=${closing}`);
};

export default (PropTypes, extension) => {
  if (!PropTypes) {
    throw new Error('Must provide React.PropTypes.');
  }

  const types = {
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
    RegExp: PropTypes.instanceOf(RegExp),
  };

  const addTypes = (dest, typeOverrides) => {
    forEach(typeOverrides, (type, name) => {
      if (typeof type === 'function' && type.prototype) {
        dest[name] = PropTypes.instanceOf(type);
      } else {
        dest[name] = type;
      }
    });
  };

  if (extension) {
    addTypes(types, extension);
  }

  let tmpTypes = {};

  const getType = (name) => {
    if (tmpTypes[name]) return tmpTypes[name];
    if (types[name]) return types[name];
    throw new Error(`Expected valid named type. Instead, saw '${name}'.`);
  };

  const parseType = (tokens) => {
    const isRequired = last(tokens) === CHAR_REQUIRED;
    if (isRequired) {
      tokens = tokens.slice(0, tokens.length - 1);
    }

    let innerTokens;
    let type;
    switch (tokens[0]) {
    case CHAR_LIST_OPEN:
      if (last(tokens) !== CHAR_LIST_CLOSE) {
        throw new Error(`Expected to end with ${CHAR_LIST_CLOSE}. Instead, saw '${last(tokens)}'. ${tokens}`);
      }

      innerTokens = getInnerTokens(tokens, CHAR_LIST_OPEN, CHAR_LIST_CLOSE, 1);
      if (innerTokens.length + 2 !== tokens.length) {
        throw new Error(`Invalid wrapping with ${CHAR_LIST_OPEN} ${CHAR_LIST_CLOSE}. ${tokens}`);
      }

      type = PropTypes.arrayOf(parseType(innerTokens));
      break;

    case CHAR_SHAPE_OPEN:
      if (last(tokens) !== CHAR_SHAPE_CLOSE) {
        throw new Error(`Expected to end with ${CHAR_SHAPE_CLOSE}. Instead, saw '${last(tokens)}'. ${tokens}`);
      }

      innerTokens = getInnerTokens(tokens, CHAR_SHAPE_OPEN, CHAR_SHAPE_CLOSE, 1);
      if (innerTokens.length + 2 !== tokens.length) {
        throw new Error(`Invalid wrapping with ${CHAR_SHAPE_OPEN} ${CHAR_SHAPE_CLOSE}. ${tokens}`);
      }

      type = PropTypes.shape(parseShape(innerTokens));
      break;

    default:
      if (tokens.length !== 1) {
        throw new Error(`Invalid type name. ${tokens}`);
      }
      type = getType(tokens[0]);
      break;
    }

    if (isRequired && !type.isRequired) {
      throw new Error(`Type does not support isRequired. ${tokens}`);
    }
    return isRequired ? type.isRequired : type;
  };


  const parseShape = (tokens) => {
    if (!tokens.length) {
      throw new Error('Empty shape.');
    }

    const shape = {};

    let state = STATE_NEED_NAME;
    let name = null;
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      let innerTokens;

      switch (state) {

      case STATE_NEED_NAME:
        if (spreadRegexp.test(token)) {
          name = token.substring(3);
          if (!namedPropTypes[name]) {
            throw new Error(`Unknown type to spread. name=${name}`);
          }

          forEach(namedPropTypes[name], (value, key) => shape[key] = value);
          state = STATE_NEED_NAME;
        } else {
          if (!isValidName(token)) {
            throw new Error(`Expected valid name. Instead, saw '${token}'.`);
          }

          name = token;
          state = STATE_NEED_NAME_COLON;
        }
        break;

      case STATE_NEED_NAME_COLON:
        if (token !== CHAR_COLON) {
          throw new Error(`Expected colon after name='${name}'. Instead, saw '${token}'.`);
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
            throw new Error(`Type does support isRequired. name=${name}`);
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
        throw new Error(`Unknown state. state=${state}`);
      }
    }

    if (state === STATE_NEED_NAME_COLON || state === STATE_NEED_TYPE) {
      throw new Error(`Incomplete shape. ${tokens}`);
    }

    return shape;
  };

  const namedPropTypes = {};

  const parser = (string, typeOverrides) => {
    let tokens = string.replace(punctuatorRegexp, ' $1 ').split(/[\n\s,;]+/g).filter((x) => x);

    let name;
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
      throw new Error(`'${name}' type is already defined.`);
    }

    const shape = parseShape(tokens.slice(1, tokens.length - 1));

    if (name) {
      namedPropTypes[name] = shape;
      types[name] = PropTypes.shape(shape);
    }

    return shape;
  };

  parser.getPropTypes = (name) => namedPropTypes[name] || null;

  parser.getType = (name) => types[name] || null;

  return parser;
};
