const STATE_NEED_NAME = 'need_name';
const STATE_NEED_NAME_COLON = 'need_name_colon';
const STATE_NEED_TYPE = 'need_type';
const STATE_SEEN_TYPE = 'seen_type';


const CHAR_ASSIGNMENT = ':';
const CHAR_REQUIRED = '!';
const CHAR_UNION = '|';

const CHAR_LIST_OPEN = '[';
const CHAR_LIST_CLOSE = ']';
const CHAR_SHAPE_OPEN = '{';
const CHAR_SHAPE_CLOSE = '}';
const CHAR_GROUP_OPEN = '(';
const CHAR_GROUP_CLOSE = ')';
const CHAR_QUOTE_OPEN = "'";
const CHAR_QUOTE_CLOSE = "'";

const NODE_TYPE_LEAF = 'LEAF';
const NODE_TYPE_ASSIGNMENT = 'ASSIGNMENT';
const NODE_TYPE_SPREAD = 'SPREAD';
const NODE_TYPE_REQUIRED = 'REQUIRED';
const NODE_TYPE_UNION = 'UNION';
const NODE_TYPE_LIST = 'LIST';
const NODE_TYPE_SHAPE = 'SHAPE';
const NODE_TYPE_GROUP = 'GROUP';
const NODE_TYPE_QUOTE = 'QUOTE';

const GROUPS = {
  [CHAR_LIST_OPEN]: {
    type: NODE_TYPE_LIST,
    opening: CHAR_LIST_OPEN,
    closing: CHAR_LIST_CLOSE,
  },
  [CHAR_SHAPE_OPEN]: {
    type: NODE_TYPE_SHAPE,
    opening: CHAR_SHAPE_OPEN,
    closing: CHAR_SHAPE_CLOSE,
  },
  [CHAR_GROUP_OPEN]: {
    type: NODE_TYPE_GROUP,
    opening: CHAR_GROUP_OPEN,
    closing: CHAR_GROUP_CLOSE,
  },
  [CHAR_QUOTE_OPEN]: {
    type: NODE_TYPE_QUOTE,
    opening: CHAR_QUOTE_OPEN,
    closing: CHAR_QUOTE_CLOSE,
  },
};

const punctuatorRegexp = /([\!\(\)\:\[\]\{\}\'\,])/g;
// https://facebook.github.io/graphql/#sec-Names
const nameRegexp = /[_A-Za-z][_0-9A-Za-z]*/;
const spreadRegexp = /^\.\.\./;

const isValidName = (name) => nameRegexp.test(name);

const last = (list) => list[list.length - 1];

const forEach = (obj, fn) =>
  Object.keys(obj).forEach((name) => fn(obj[name], name, obj));

const copy = (dest, src) =>
  forEach(src, (value, key) => { dest[key] = value; });

const createCleanObject = (props) => {
  const obj = Object.create(null);
  if (props) copy(obj, props);
  return obj;
};

const getInnerTokens = (tokens, opening, closing, start = 0) => {
  let level = 0;
  for (let i = start; i < tokens.length; i++) {
    const token = tokens[i];
    if (token === closing) {
      if (!level) {
        return tokens.slice(start, i);
      }
      level--;
    } else if (token === opening) {
      level++;
    }
  }
  throw new Error(`No closing char is found. char=${closing}`);
};


export default (PropTypes, extension) => {
  if (!PropTypes) {
    throw new Error('Must provide React.PropTypes.');
  }

  const types = createCleanObject({
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
  });

  const namedPropTypes = createCleanObject();

  let tmpTypes;


  const maybeConvertClassToType = (type) => {
    if (typeof type === 'function' && type.prototype) {
      return PropTypes.instanceOf(type);
    }
    return type;
  };

  const addTypes = (dest, typeOverrides) => {
    forEach(typeOverrides, (type, name) => {
      dest[name] = maybeConvertClassToType(type);
    });
  };

  if (extension) {
    addTypes(types, extension);
  }

  const addPropTypes = (name, propTypes) => {
    if (types[name]) {
      throw new Error(`'${name}' type is already defined.`);
    }
    namedPropTypes[name] = propTypes;
    types[name] = PropTypes.shape(propTypes);
  };

  const getType = (name) => {
    if (tmpTypes[name]) return tmpTypes[name];
    if (types[name]) return types[name];
    throw new Error(`Expected valid named type. Instead, saw '${name}'.`);
  };

  const splitAssignments = (children) => {
    const assignments = [];

    let state = STATE_NEED_NAME;
    let nameNode = null;
    let operatorNode = null;
    let valueNodes = [];

    const isColonNode = ({type, value}) =>
        type === NODE_TYPE_LEAF &&
        value === CHAR_ASSIGNMENT;

    const isSpreadNode = ({type, value}) =>
        type === NODE_TYPE_LEAF &&
        spreadRegexp.test(value);

    for (let i = 0; i < children.length; i++) {
      const node = children[i];
      const {type, value} = node;

      switch (state) {
      case STATE_NEED_NAME:
        if (type !== NODE_TYPE_LEAF) {
          console.error(node);
          throw new Error('Expected property name.');
        }
        if (isSpreadNode(node)) {
          assignments.push({
            type: NODE_TYPE_SPREAD,
            value,
            right: {
              type: NODE_TYPE_LEAF,
              value: value.substring(3),
            }
          });
          state = STATE_NEED_NAME;
        } else {
          nameNode = node;
          state = STATE_NEED_NAME_COLON;
        }
        break;
      case STATE_NEED_NAME_COLON:
        if (!isColonNode(node)) {
          console.error(node, nameNode, operatorNode, valueNodes);
          throw new Error(`Expected assignment operator, '${CHAR_ASSIGNMENT}'`);
        }
        operatorNode = node;
        state = STATE_NEED_TYPE;
        break;
      case STATE_NEED_TYPE:
        if (isColonNode(node)) {
          if (valueNodes.length < 2) {
            console.error(node, nameNode, operatorNode, valueNodes);
            throw new Error(`Unexpected assignment operator, '${CHAR_ASSIGNMENT}'`);
          }

          const prevNameNode = nameNode;

          nameNode = valueNodes.pop();
          if (nameNode.type !== NODE_TYPE_LEAF) {
            console.error(node, nameNode, operatorNode, valueNodes);
            throw new Error('Expected property name before colon.');
          }

          assignments.push({
            type: NODE_TYPE_ASSIGNMENT,
            value: operatorNode.value,
            left: prevNameNode,
            right: valueNodes,
          });

          operatorNode = node;
          valueNodes = [];
          state = STATE_NEED_TYPE;
        } else if (isSpreadNode(node)) {
          if (!valueNodes.length) {
            throw new Error(`Expected type, but saw spread operator. name=${nameNode.value}`);
          }

          assignments.push(
            {
              type: NODE_TYPE_ASSIGNMENT,
              value: operatorNode.value,
              left: nameNode,
              right: valueNodes,
            },
            {
              type: NODE_TYPE_SPREAD,
              value,
              right: {
                type: NODE_TYPE_LEAF,
                value: value.substring(3),
              }
            }
          );
          nameNode = null;
          operatorNode = null;
          valueNodes = [];
          state = STATE_NEED_NAME;
        } else {
          valueNodes.push(node);
        }
        break;
      }
    }

    if (nameNode) {
      if (operatorNode) {
        if (valueNodes.length) {
          assignments.push(
            {
              type: NODE_TYPE_ASSIGNMENT,
              value: operatorNode.value,
              left: nameNode,
              right: valueNodes,
            }
          );
        } else {
          throw new Error(`Expected type after colon. name=${nameNode.value}`);
        }
      } else {
        throw new Error(`Unexpected name. name=${nameNode.value}`);
      }
    }

    return assignments;
  };

  const buildExpressions = (tokens) => {
    let copy = [];

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token.value === CHAR_REQUIRED) {
        const lastToken = copy.pop();
        if (!lastToken) {
          // postfix unary operator
          throw new Error(`Expected type before '${CHAR_REQUIRED}'.`);
        }
        copy.push({
          type: NODE_TYPE_REQUIRED,
          value: CHAR_REQUIRED,
          left: lastToken,
        });
      } else {
        copy.push(token);
      }
    }

    tokens = copy;
    copy = [];
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token.value === CHAR_UNION) {
        const lastToken = copy.pop();
        const nextToken = tokens[i + 1];
        if (!lastToken || !nextToken) {
          throw new Error(`Expected types on both sides of '${CHAR_UNION}'.`);
        }
        copy.push({
          type: NODE_TYPE_UNION,
          value: CHAR_UNION,
          left: lastToken,
          right: nextToken,
        });
        i = i + 2;
      } else {
        copy.push(token);
      }
    }

    return copy;
  };

  const buildTreeByGrouping = (tokens) => {
    const node = {
      children: [],
    };
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      let child;
      if (GROUPS[token]) {
        const group = GROUPS[token];
        const innerTokens = getInnerTokens(tokens, token, group.closing, i + 1);
        child = {
          ...group,
          ...buildTreeByGrouping(innerTokens),
        };
        if (token === CHAR_SHAPE_OPEN) {
          child.children = splitAssignments(child.children);
        }
        if (token === CHAR_SHAPE_OPEN || token === CHAR_GROUP_OPEN || token === CHAR_LIST_OPEN) {
          child.children.forEach((child) => {
            const {type, right} = child;
            if (type === NODE_TYPE_ASSIGNMENT) {
              child.right = buildExpressions(right);
            }
          });
        }
        i += innerTokens.length + 1;
      } else {
        let lastChild;
        switch (token) {
          /*
        case CHAR_ASSIGNMENT = ':':
          lastChild = node.children.pop();
          if (!lastChild || lastChild.type !== NODE_TYPE_LEAF) {
            throw new Error(`Name is required before '${CHAR_ASSIGNMENT}'`);
          }
          const {value, nextIndex} = buildAssignment(tokens.slice(i + 1);
          child = {
            type: NODE_TYPE_ASSIGNMENT,
            token,
            left: lastChild,
            right: value,
          };
          i = nextIndex;
          break;
        case CHAR_REQUIRED = '!':
          lastChild = node.children.pop();
          child = {
            type: NODE_TYPE_REQUIRED,
            token,
            left: lastChild,
          };
          break;
        case CHAR_UNION = '|':
          lastChild = node.children.pop();
          if (i >= tokens.length - 1) {
            throw new Error(`Union needs another type.`);
          }
          child = {
            type: NODE_TYPE_ASSIGNMENT,
            token,
            left: lastChild,
            right: buildTreeByGrouping(tokens.slice(i + 1)),
          };
          i = tokens.length;
          break;
          */
        default:
          child = {
            type: NODE_TYPE_LEAF,
            value: token,
          };
        }
      }
      node.children.push(child);
    }
    return node;
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


  const parseShapeNode = ({children}) => {
    if (!children.length) throw new Error('Empty shape.');

    const shape = {};

    let state = STATE_NEED_NAME;
    let name = null;
    for (let i = 0; i < children.length; i++) {
      const {type, value} = children[i];
      let innerTokens;

      switch (state) {

      case STATE_NEED_NAME:
        if (type !== NODE_TYPE_LEAF) {
          throw new Error(`Expected valid name. Instead, saw '${type}' node.`);
        }

        if (spreadRegexp.test(value)) {
          name = value.substring(3);
          if (!namedPropTypes[name]) {
            throw new Error(`Unknown type to spread. name=${name}`);
          }

          copy(shape, namedPropTypes[name]);
          state = STATE_NEED_NAME;
        } else {
          if (!isValidName(value)) {
            throw new Error(`Expected valid name. Instead, saw '${value}'.`);
          }

          name = value;
          state = STATE_NEED_NAME_COLON;
        }
        break;

      case STATE_NEED_NAME_COLON:
        if (value !== CHAR_ASSIGNMENT) {
          throw new Error(`Expected colon after name='${name}'. Instead, saw '${value}'.`);
        }
        state = STATE_NEED_TYPE;
        break;

      case STATE_NEED_TYPE:
        const NODE_TYPE_LEAF = 'LEAF';
        const NODE_TYPE_LIST = 'LIST';
        const NODE_TYPE_SHAPE = 'SHAPE';
        const NODE_TYPE_GROUP = 'GROUP';
        const NODE_TYPE_QUOTE = 'QUOTE';
        switch (type) {
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
          shape[name] = getType(value);
          break;
        }

        state = STATE_SEEN_TYPE;
        break;

      case STATE_SEEN_TYPE:
        switch (value) {
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


  const parseShape = (tokens) => {
    if (!tokens.length) throw new Error('Empty shape.');

    const shape = {};

    let state = STATE_NEED_NAME;
    let name = null;
    for (let i = 0; i < tokens.length; i++) {
      const value = tokens[i];
      let innerTokens;

      switch (state) {

      case STATE_NEED_NAME:
        if (spreadRegexp.test(value)) {
          name = value.substring(3);
          if (!namedPropTypes[name]) {
            throw new Error(`Unknown type to spread. name=${name}`);
          }

          copy(shape, namedPropTypes[name]);
          state = STATE_NEED_NAME;
        } else {
          if (!isValidName(value)) {
            throw new Error(`Expected valid name. Instead, saw '${value}'.`);
          }

          name = value;
          state = STATE_NEED_NAME_COLON;
        }
        break;

      case STATE_NEED_NAME_COLON:
        if (value !== CHAR_ASSIGNMENT) {
          throw new Error(`Expected colon after name='${name}'. Instead, saw '${value}'.`);
        }
        state = STATE_NEED_TYPE;
        break;

      case STATE_NEED_TYPE:
        switch (value) {
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
          shape[name] = getType(value);
          break;
        }

        state = STATE_SEEN_TYPE;
        break;

      case STATE_SEEN_TYPE:
        switch (value) {
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


  const parser = (string, typeOverrides) => {
    let tokens = string.replace(punctuatorRegexp, ' $1 ').split(/[\n\s,;]+/g).filter((x) => x);

    console.log('tokens', tokens.join(' '));
    console.log(JSON.stringify(buildTreeByGrouping(tokens), null, '  '));

    let name;
    if (isValidName(tokens[0])) {
      name = tokens[0];
      tokens = tokens.slice(1);
    }

    if (tokens[0] !== CHAR_SHAPE_OPEN || last(tokens) !== CHAR_SHAPE_CLOSE) {
      throw new Error('Must wrap definition with { }.');
    }

    tmpTypes = createCleanObject();
    if (typeOverrides) addTypes(tmpTypes, typeOverrides);

    if (types[name] || tmpTypes[name]) {
      throw new Error(`'${name}' type is already defined.`);
    }

    const propTypes = parseShape(tokens.slice(1, tokens.length - 1));

    if (name) addPropTypes(name, propTypes);

    return propTypes;
  };

  parser.getType = (name) => types[name] || null;

  parser.getPropTypes = (name) => namedPropTypes[name] || null;

  parser.addType = (name, type) => {
    if (types[name]) {
      throw new Error(`'${name}' type is already defined.`);
    }
    if (type.constructor === Object) {
      addPropTypes(name, type);
    } else {
      types[name] = maybeConvertClassToType(type);
    }
  };

  return parser;
};
