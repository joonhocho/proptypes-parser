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

const OPERATOR_ASSIGNMENT = ':';
const OPERATOR_REQUIRED = '!';
const OPERATOR_UNION = '|';
const OPERATOR_SPREAD = '...';

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

const punctuatorRegexp = /([\!\(\)\:\[\]\{\}\'\,]|\.\.\.)/g;

// https://facebook.github.io/graphql/#sec-Names
const nameRegexp = /[_A-Za-z][_0-9A-Za-z]*/;

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
      i += innerTokens.length + 1;
    } else {
      child = createLeafNode(token);
    }
    node.children.push(child);
  }
  return node;
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

const assertNameNode = (node) => {
  assertNodeType(node, NODE_TYPE_LEAF);
  if (isValidName(node.value)) return true;
  console.error(node);
  throw new Error('Invalid name node.');
};

const isPropType = (node) => typeof node === 'function';

const isOptionalPropType = (type) => isPropType(type) && Boolean(type.isRequired);

const isRequiredPropType = (type) => isPropType(type) && !type.isRequired;

const reduceNameNode = (node) => {
  assertNameNode(node);
  return node;
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

  const assertSpreadableTypeName = (name) => {
    if (namedPropTypes[name]) return true;
    throw new Error(`Unknown type to spread. name=${name}`);
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
    if (isOptionalPropType(propType)) return propType.isRequired;

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
    const isRequired = isRequiredPropType(left) && isRequiredPropType(right);

    const propType = PropTypes.oneOfType([
      reduceTypeNode(left),
      reduceTypeNode(right),
    ]);

    return isRequired ? propType.isRequired : propType;
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

    const shape = {};

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

    if (name) addPropTypes(name, propTypesFromTree);
    return propTypesFromTree;
  };

  parser.getType = (name) => types[name] || null;

  parser.getPropTypes = (name) => namedPropTypes[name] || null;

  parser.addType = (name, type) => {
    if (types[name]) {
      throw new Error(`'${name}' type is already defined.`);
    }
    if (type.constructor === Object ||
      (type && typeof type === 'object' && !type.constructor)) {
      addPropTypes(name, type);
    } else {
      types[name] = maybeConvertClassToType(type);
    }
  };

  parser.PT = (strings) => parser(strings.raw[0]);

  return parser;
};
