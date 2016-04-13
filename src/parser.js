const STATE_NEED_NAME = 'need_name';
const STATE_NEED_NAME_COLON = 'need_name_colon';
const STATE_NEED_TYPE = 'need_type';
const STATE_SEEN_TYPE = 'seen_type';


const OPERATOR_ASSIGNMENT = ':';
const OPERATOR_REQUIRED = '!';
const OPERATOR_UNION = '|';
const OPERATOR_SPREAD = '...';

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

const punctuatorRegexp = /([\!\(\)\:\[\]\{\}\'\,]|\.\.\.)/g;
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


  const createLeafNode = (value) => ({
    type: NODE_TYPE_LEAF,
    value,
  });

  const createRequiredNode = (value) => ({
    type: NODE_TYPE_REQUIRED,
    value: OPERATOR_REQUIRED,
    children: [value],
  });

  const createSpreadNode = (node) => ({
    type: NODE_TYPE_SPREAD,
    value: OPERATOR_SPREAD,
    children: [node],
  });

  const createUnionNode = (left, right) => ({
    type: NODE_TYPE_UNION,
    value: OPERATOR_UNION,
    children: [left, right],
  });

  const createAssignmentNode = (name, value) => ({
    type: NODE_TYPE_ASSIGNMENT,
    value: OPERATOR_ASSIGNMENT,
    children: [name, value],
  });

  const OPERATOR_TYPE_PREFIX = 'PREFIX';
  const OPERATOR_TYPE_POSTFIX = 'POSTFIX';
  const OPERATOR_TYPE_BINARY = 'BINARY';

  const operators = [
    {
      operator: OPERATOR_REQUIRED,
      type: OPERATOR_TYPE_POSTFIX,
      build: (left) => createRequiredNode(left),
    },
    {
      operator: OPERATOR_SPREAD,
      type: OPERATOR_TYPE_PREFIX,
      build: (right) => createSpreadNode(right),
    },
    {
      operator: OPERATOR_UNION,
      type: OPERATOR_TYPE_BINARY,
      build: (left, right) => createUnionNode(left, right),
    },
    {
      operator: OPERATOR_ASSIGNMENT,
      type: OPERATOR_TYPE_BINARY,
      build: (left, right) => createAssignmentNode(left, right),
    },
  ];

  const splitAssignments = (children) => {
    const assignments = [];

    let state = STATE_NEED_NAME;
    let nameNode = null;
    let operatorNode = null;
    let valueNodes = [];

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
          assignments.push(
            createSpreadNode(
              createLeafNode(value.substring(3))
            )
          );

          state = STATE_NEED_NAME;
        } else {
          nameNode = node;
          state = STATE_NEED_NAME_COLON;
        }
        break;
      case STATE_NEED_NAME_COLON:
        if (!isColonNode(node)) {
          console.error(node, nameNode, operatorNode, valueNodes);
          throw new Error(`Expected assignment operator, '${OPERATOR_ASSIGNMENT}'`);
        }
        operatorNode = node;
        state = STATE_NEED_TYPE;
        break;
      case STATE_NEED_TYPE:
        if (isColonNode(node)) {
          if (valueNodes.length < 2) {
            console.error(node, nameNode, operatorNode, valueNodes);
            throw new Error(`Unexpected assignment operator, '${OPERATOR_ASSIGNMENT}'`);
          }

          const prevNameNode = nameNode;

          nameNode = valueNodes.pop();
          if (nameNode.type !== NODE_TYPE_LEAF) {
            console.error(node, nameNode, operatorNode, valueNodes);
            throw new Error('Expected property name before colon.');
          }

          assignments.push(createAssignmentNode(prevNameNode, valueNodes));

          operatorNode = node;
          valueNodes = [];
          state = STATE_NEED_TYPE;
        } else if (isSpreadNode(node)) {
          if (!valueNodes.length) {
            throw new Error(`Expected type, but saw spread operator. name=${nameNode.value}`);
          }

          assignments.push(
            createAssignmentNode(nameNode, valueNodes),
            createSpreadNode(
              createLeafNode(value.substring(3))
            )
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
          assignments.push(createAssignmentNode(nameNode, valueNodes));
        } else {
          throw new Error(`Expected type after colon. name=${nameNode.value}`);
        }
      } else {
        throw new Error(`Unexpected name. name=${nameNode.value}`);
      }
    }

    return assignments;
  };


  const transformChildren = (children, {operator, type, build}) => {
    const newChildren = children.slice();
    for (let i = 0; i < newChildren.length; i++) {
      const child = newChildren[i];
      if (child.value === operator) {
        let left, right;
        switch (type) {
        case OPERATOR_TYPE_PREFIX:
          right = newChildren[i + 1];
          if (!right) {
            throw new Error(`Prefix unary operator '${operator}' requires right side argument.`);
          }
          newChildren.splice(i, 2, build(right));
          break;
        case OPERATOR_TYPE_POSTFIX:
          left = newChildren[i - 1];
          if (!left) {
            throw new Error(`Prefix unary operator '${operator}' requires left side argument.`);
          }
          newChildren.splice(i - 1, 2, build(left));
          i--;
          break;
        case OPERATOR_TYPE_BINARY:
          left = newChildren[i - 1];
          if (!left) {
            throw new Error(`Binary operator '${operator}' requires left side argument.`);
          }
          right = newChildren[i + 1];
          if (!right) {
            throw new Error(`Binary operator '${operator}' requires right side argument.`);
          }
          newChildren.splice(i - 1, 3, build(left, right));
          i--;
          break;
        }
      }
    }
    return newChildren;
  };

  const traverseTreePostOrder = (node, fn) => {
    const {children} = node;
    if (children) children.forEach((child) => { traverseTreePostOrder(child, fn); });
    fn(node);
  };

  const reduceTreePostOrder = (node, fn) => {
    const newNode = {...node};
    if (node.children) {
      newNode.children = node.children.map((child) => reduceTreePostOrder(child, fn)).filter((x) => x);
    }
    return fn(newNode);
  };

  const transformTreeWithOperators = (node) => {
    traverseTreePostOrder(node, (child) => {
      if (child.children) {
        child.children = operators.reduce(transformChildren, child.children);
      }
    });
  };

  const assertNodeType = (node, expected) => {
    if (node.type === expected) return true;
    console.error(node);
    throw new Error(`Expected node type '${expected}', but was '${node.type}'.`);
  };

  const isColonNode = (node) =>
    assertNodeType(node, NODE_TYPE_LEAF) &&
    node.value === OPERATOR_ASSIGNMENT;

  const isSpreadNode = (node) =>
    assertNodeType(node, NODE_TYPE_LEAF) &&
    spreadRegexp.test(value);

  const isNameNode = (node) =>
    assertNodeType(node, NODE_TYPE_LEAF) &&
    isValidName(node.value);

  const assertNameNode = (node) => {
    if (isNameNode(node)) return true;
    console.error(node);
    throw new Error(`Invalid name node.`);
  };

  const assertSpreadableTypeName = (name) => {
    if (namedPropTypes[name]) return true;
    throw new Error(`Unknown type to spread. name=${name}`);
  };

  const isPropType = (node) => typeof node === 'function';

  const reduceNameNode = (node) => {
    assertNameNode(node);
    return node;
  };

  const reduceNamedTypeNode = (node) => {
    assertNameNode(node);
    const {value} = node;

    const propType = getType(value);
    if (propType) return propType;

    throw new Error(`Unknown type name. name=${value}`);
  };

  const reduceTypeNode = (node) => {
    if (isPropType(node)) return node;

    switch (node.type) {
    case NODE_TYPE_LEAF:
      return reduceNamedTypeNode(node);
    case NODE_TYPE_SHAPE:
      return PropTypes.shape(node.value);
    default:
      console.error(node);
      throw new Error(`Unexpected type to reduce as type. ${node.type}`);
    }
  };

  const reduceRequiredNode = (node) => {
    assertNodeType(node, NODE_TYPE_REQUIRED);

    const propType = reduceTypeNode(node.children[0]);
    if (propType.isRequired) return propType.isRequired;

    console.error(propType);
    throw new Error(`PropType does not support 'isRequired'.`);
  };

  const reduceAssignmentNode = (node) => {
    assertNodeType(node, NODE_TYPE_ASSIGNMENT);

    const {
      type,
      children: [nameNode, valueNode],
    } = node;

    assertNameNode(nameNode);

    return {
      type,
      name: nameNode.value,
      value: reduceTypeNode(valueNode),
    };
  };

  const reduceSpreadNode = (node) => {
    assertNodeType(node, NODE_TYPE_SPREAD);

    const {
      type,
      children: [nameNode],
    } = node;

    assertNameNode(nameNode);
    assertSpreadableTypeName(nameNode.value);

    return {
      type,
      value: namedPropTypes[nameNode.value],
    };
  };

  const reduceUnionNode = (node) => {
    assertNodeType(node, NODE_TYPE_UNION);

    const [left, right] = node.children;

    return PropTypes.oneOfType([
      reduceTypeNode(left),
      reduceTypeNode(right)
    ]);
  };

  const reduceListTypeNode = (node) => {
    // TODO could be enums.
    assertNodeType(node, NODE_TYPE_LIST);

    if (node.children.length !== 1) {
      console.error(node);
      throw new Error('List type should have only one child.');
    }

    const [typeNode] = node.children;

    return PropTypes.arrayOf(reduceTypeNode(typeNode));
  };

  const reduceGroupNode = (node) => {
    assertNodeType(node, NODE_TYPE_GROUP);

    if (node.children.length !== 1) {
      console.error(node);
      throw new Error('Group type should have only one child.');
    }

    const [typeNode] = node.children;
    return reduceTypeNode(typeNode);
  };

  const reduceShapeNode = (node) => {
    assertNodeType(node, NODE_TYPE_SHAPE);

    const {type, children} = node;
    if (!children.length) {
      console.error(node);
      throw new Error('Empty shape.');
    }

    const shape = createCleanObject();

    children.forEach((node) => {
      const {type: childType, name, value} = node;
      switch (childType) {
      case NODE_TYPE_SPREAD:
        copy(shape, value);
        break;
      case NODE_TYPE_ASSIGNMENT:
        shape[name] = value;
        break;
      default:
        console.error(node);
        throw new Error(`Unexpected type inside shape. ${childType}`);
      }
    });

    return {
      type,
      value: shape,
    };
  };

  const reduceTreeToPropTypes = (root) => {
    return reduceTreePostOrder(root, (node) => {
      console.log(node.type, node.operator, node.value, node.children && node.children.length || 0);
      switch (node.type) {
      case NODE_TYPE_LEAF:
        // All Leaves should be valid names at this point.
        return reduceNameNode(node);
      case NODE_TYPE_ASSIGNMENT:
        return reduceAssignmentNode(node);
      case NODE_TYPE_SPREAD:
        return reduceSpreadNode(node);
      case NODE_TYPE_REQUIRED:
        return reduceRequiredNode(node);
      case NODE_TYPE_UNION:
        return reduceUnionNode(node);
      case NODE_TYPE_LIST:
        return reduceListTypeNode(node);
      case NODE_TYPE_SHAPE:
        return reduceShapeNode(node);
      case NODE_TYPE_GROUP:
        return reduceGroupNode(node);
      case NODE_TYPE_QUOTE:
        // TODO Support enums.
        break;
      default:
        console.error(node);
        throw new Error(`Unknown node type. '${node.type}'`);
      }
    });
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
          //child.children = splitAssignments(child.children);
        }
        i += innerTokens.length + 1;
      } else {
        let lastChild;
        switch (token) {
          /*
        case OPERATOR_ASSIGNMENT = ':':
          lastChild = node.children.pop();
          if (!lastChild || lastChild.type !== NODE_TYPE_LEAF) {
            throw new Error(`Name is required before '${OPERATOR_ASSIGNMENT}'`);
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
        case OPERATOR_REQUIRED = '!':
          lastChild = node.children.pop();
          child = {
            type: NODE_TYPE_REQUIRED,
            token,
            left: lastChild,
          };
          break;
        case OPERATOR_UNION = '|':
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
          child = createLeafNode(token);
        }
      }
      node.children.push(child);
    }
    return node;
  };


  const parseType = (tokens) => {
    const isRequired = last(tokens) === OPERATOR_REQUIRED;
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
        if (value !== OPERATOR_ASSIGNMENT) {
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
        case OPERATOR_REQUIRED:
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
        if (value !== OPERATOR_ASSIGNMENT) {
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
        case OPERATOR_REQUIRED:
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

    const node = buildTreeByGrouping(tokens);
    transformTreeWithOperators(node);

    if (node.children.length !== 1) {
      throw new Error('Only one definition is allowed.');
    }
    const [shapeNode] = node.children;
    assertNodeType(shapeNode, NODE_TYPE_SHAPE);

    const propTypesFromTree = reduceTreeToPropTypes(shapeNode).value;
    console.log(propTypesFromTree);

    if (name) addPropTypes(name, propTypesFromTree);
    return propTypesFromTree;

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
