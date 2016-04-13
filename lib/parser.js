'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _GROUPS;

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var STATE_NEED_NAME = 'need_name';
var STATE_NEED_NAME_COLON = 'need_name_colon';
var STATE_NEED_TYPE = 'need_type';
var STATE_SEEN_TYPE = 'seen_type';

var OPERATOR_ASSIGNMENT = ':';
var OPERATOR_REQUIRED = '!';
var OPERATOR_UNION = '|';
var OPERATOR_SPREAD = '...';

var CHAR_LIST_OPEN = '[';
var CHAR_LIST_CLOSE = ']';
var CHAR_SHAPE_OPEN = '{';
var CHAR_SHAPE_CLOSE = '}';
var CHAR_GROUP_OPEN = '(';
var CHAR_GROUP_CLOSE = ')';
var CHAR_QUOTE_OPEN = "'";
var CHAR_QUOTE_CLOSE = "'";

var NODE_TYPE_LEAF = 'LEAF';
var NODE_TYPE_ASSIGNMENT = 'ASSIGNMENT';
var NODE_TYPE_SPREAD = 'SPREAD';
var NODE_TYPE_REQUIRED = 'REQUIRED';
var NODE_TYPE_UNION = 'UNION';
var NODE_TYPE_LIST = 'LIST';
var NODE_TYPE_SHAPE = 'SHAPE';
var NODE_TYPE_GROUP = 'GROUP';
var NODE_TYPE_QUOTE = 'QUOTE';

var GROUPS = (_GROUPS = {}, _defineProperty(_GROUPS, CHAR_LIST_OPEN, {
  type: NODE_TYPE_LIST,
  opening: CHAR_LIST_OPEN,
  closing: CHAR_LIST_CLOSE
}), _defineProperty(_GROUPS, CHAR_SHAPE_OPEN, {
  type: NODE_TYPE_SHAPE,
  opening: CHAR_SHAPE_OPEN,
  closing: CHAR_SHAPE_CLOSE
}), _defineProperty(_GROUPS, CHAR_GROUP_OPEN, {
  type: NODE_TYPE_GROUP,
  opening: CHAR_GROUP_OPEN,
  closing: CHAR_GROUP_CLOSE
}), _defineProperty(_GROUPS, CHAR_QUOTE_OPEN, {
  type: NODE_TYPE_QUOTE,
  opening: CHAR_QUOTE_OPEN,
  closing: CHAR_QUOTE_CLOSE
}), _GROUPS);

var punctuatorRegexp = /([\!\(\)\:\[\]\{\}\'\,]|\.\.\.)/g;
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

var copy = function copy(dest, src) {
  return forEach(src, function (value, key) {
    dest[key] = value;
  });
};

var createCleanObject = function createCleanObject(props) {
  var obj = Object.create(null);
  if (props) copy(obj, props);
  return obj;
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

  var types = createCleanObject({
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
  });

  var namedPropTypes = createCleanObject();

  var tmpTypes = void 0;

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

  if (extension) {
    addTypes(types, extension);
  }

  var addPropTypes = function addPropTypes(name, propTypes) {
    if (types[name]) {
      throw new Error('\'' + name + '\' type is already defined.');
    }
    namedPropTypes[name] = propTypes;
    types[name] = PropTypes.shape(propTypes);
  };

  var getType = function getType(name) {
    if (tmpTypes[name]) return tmpTypes[name];
    if (types[name]) return types[name];
    throw new Error('Expected valid named type. Instead, saw \'' + name + '\'.');
  };

  var createLeafNode = function createLeafNode(value) {
    return {
      type: NODE_TYPE_LEAF,
      value: value
    };
  };

  var createRequiredNode = function createRequiredNode(value) {
    return {
      type: NODE_TYPE_REQUIRED,
      value: OPERATOR_REQUIRED,
      children: [value]
    };
  };

  var createSpreadNode = function createSpreadNode(node) {
    return {
      type: NODE_TYPE_SPREAD,
      value: OPERATOR_SPREAD,
      children: [node]
    };
  };

  var createUnionNode = function createUnionNode(left, right) {
    return {
      type: NODE_TYPE_UNION,
      value: OPERATOR_UNION,
      children: [left, right]
    };
  };

  var createAssignmentNode = function createAssignmentNode(name, value) {
    return {
      type: NODE_TYPE_ASSIGNMENT,
      value: OPERATOR_ASSIGNMENT,
      children: [name, value]
    };
  };

  var OPERATOR_TYPE_PREFIX = 'PREFIX';
  var OPERATOR_TYPE_POSTFIX = 'POSTFIX';
  var OPERATOR_TYPE_BINARY = 'BINARY';

  var operators = [{
    operator: OPERATOR_REQUIRED,
    type: OPERATOR_TYPE_POSTFIX,
    build: function build(left) {
      return createRequiredNode(left);
    }
  }, {
    operator: OPERATOR_SPREAD,
    type: OPERATOR_TYPE_PREFIX,
    build: function build(right) {
      return createSpreadNode(right);
    }
  }, {
    operator: OPERATOR_UNION,
    type: OPERATOR_TYPE_BINARY,
    build: function build(left, right) {
      return createUnionNode(left, right);
    }
  }, {
    operator: OPERATOR_ASSIGNMENT,
    type: OPERATOR_TYPE_BINARY,
    build: function build(left, right) {
      return createAssignmentNode(left, right);
    }
  }];

  var splitAssignments = function splitAssignments(children) {
    var assignments = [];

    var state = STATE_NEED_NAME;
    var nameNode = null;
    var operatorNode = null;
    var valueNodes = [];

    for (var i = 0; i < children.length; i++) {
      var node = children[i];
      var type = node.type;
      var _value = node.value;


      switch (state) {
        case STATE_NEED_NAME:
          if (type !== NODE_TYPE_LEAF) {
            console.error(node);
            throw new Error('Expected property name.');
          }
          if (isSpreadNode(node)) {
            assignments.push(createSpreadNode(createLeafNode(_value.substring(3))));

            state = STATE_NEED_NAME;
          } else {
            nameNode = node;
            state = STATE_NEED_NAME_COLON;
          }
          break;
        case STATE_NEED_NAME_COLON:
          if (!isColonNode(node)) {
            console.error(node, nameNode, operatorNode, valueNodes);
            throw new Error('Expected assignment operator, \'' + OPERATOR_ASSIGNMENT + '\'');
          }
          operatorNode = node;
          state = STATE_NEED_TYPE;
          break;
        case STATE_NEED_TYPE:
          if (isColonNode(node)) {
            if (valueNodes.length < 2) {
              console.error(node, nameNode, operatorNode, valueNodes);
              throw new Error('Unexpected assignment operator, \'' + OPERATOR_ASSIGNMENT + '\'');
            }

            var prevNameNode = nameNode;

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
              throw new Error('Expected type, but saw spread operator. name=' + nameNode.value);
            }

            assignments.push(createAssignmentNode(nameNode, valueNodes), createSpreadNode(createLeafNode(_value.substring(3))));

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
          throw new Error('Expected type after colon. name=' + nameNode.value);
        }
      } else {
        throw new Error('Unexpected name. name=' + nameNode.value);
      }
    }

    return assignments;
  };

  var transformChildren = function transformChildren(children, _ref) {
    var operator = _ref.operator;
    var type = _ref.type;
    var build = _ref.build;

    var newChildren = children.slice();
    for (var i = 0; i < newChildren.length; i++) {
      var child = newChildren[i];
      if (child.value === operator) {
        var left = void 0,
            right = void 0;
        switch (type) {
          case OPERATOR_TYPE_PREFIX:
            right = newChildren[i + 1];
            if (!right) {
              throw new Error('Prefix unary operator \'' + operator + '\' requires right side argument.');
            }
            newChildren.splice(i, 2, build(right));
            break;
          case OPERATOR_TYPE_POSTFIX:
            left = newChildren[i - 1];
            if (!left) {
              throw new Error('Prefix unary operator \'' + operator + '\' requires left side argument.');
            }
            newChildren.splice(i - 1, 2, build(left));
            i--;
            break;
          case OPERATOR_TYPE_BINARY:
            left = newChildren[i - 1];
            if (!left) {
              throw new Error('Binary operator \'' + operator + '\' requires left side argument.');
            }
            right = newChildren[i + 1];
            if (!right) {
              throw new Error('Binary operator \'' + operator + '\' requires right side argument.');
            }
            newChildren.splice(i - 1, 3, build(left, right));
            i--;
            break;
        }
      }
    }
    return newChildren;
  };

  var traverseTreePostOrder = function traverseTreePostOrder(node, fn) {
    var children = node.children;

    if (children) children.forEach(function (child) {
      traverseTreePostOrder(child, fn);
    });
    fn(node);
  };

  var reduceTreePostOrder = function reduceTreePostOrder(node, fn) {
    var newNode = _extends({}, node);
    if (node.children) {
      newNode.children = node.children.map(function (child) {
        return reduceTreePostOrder(child, fn);
      }).filter(function (x) {
        return x;
      });
    }
    return fn(newNode);
  };

  var transformTreeWithOperators = function transformTreeWithOperators(node) {
    traverseTreePostOrder(node, function (child) {
      if (child.children) {
        child.children = operators.reduce(transformChildren, child.children);
      }
    });
  };

  var assertNodeType = function assertNodeType(node, expected) {
    if (node.type === expected) return true;
    console.error(node);
    throw new Error('Expected node type \'' + expected + '\', but was \'' + node.type + '\'.');
  };

  var isColonNode = function isColonNode(node) {
    return assertNodeType(node, NODE_TYPE_LEAF) && node.value === OPERATOR_ASSIGNMENT;
  };

  var isSpreadNode = function isSpreadNode(node) {
    return assertNodeType(node, NODE_TYPE_LEAF) && spreadRegexp.test(value);
  };

  var isNameNode = function isNameNode(node) {
    return assertNodeType(node, NODE_TYPE_LEAF) && isValidName(node.value);
  };

  var assertNameNode = function assertNameNode(node) {
    if (isNameNode(node)) return true;
    console.error(node);
    throw new Error('Invalid name node.');
  };

  var assertSpreadableTypeName = function assertSpreadableTypeName(name) {
    if (namedPropTypes[name]) return true;
    throw new Error('Unknown type to spread. name=' + name);
  };

  var isPropType = function isPropType(node) {
    return typeof node === 'function';
  };

  var reduceNameNode = function reduceNameNode(node) {
    assertNameNode(node);
    return node;
  };

  var reduceNamedTypeNode = function reduceNamedTypeNode(node) {
    assertNameNode(node);
    var value = node.value;


    var propType = getType(value);
    if (propType) return propType;

    throw new Error('Unknown type name. name=' + value);
  };

  var reduceTypeNode = function reduceTypeNode(node) {
    if (isPropType(node)) return node;

    switch (node.type) {
      case NODE_TYPE_LEAF:
        return reduceNamedTypeNode(node);
      case NODE_TYPE_SHAPE:
        return PropTypes.shape(node.value);
      default:
        console.error(node);
        throw new Error('Unexpected type to reduce as type. ' + node.type);
    }
  };

  var reduceRequiredNode = function reduceRequiredNode(node) {
    assertNodeType(node, NODE_TYPE_REQUIRED);

    var propType = reduceTypeNode(node.children[0]);
    if (propType.isRequired) return propType.isRequired;

    console.error(propType);
    throw new Error('PropType does not support \'isRequired\'.');
  };

  var reduceAssignmentNode = function reduceAssignmentNode(node) {
    assertNodeType(node, NODE_TYPE_ASSIGNMENT);

    var type = node.type;

    var _node$children = _slicedToArray(node.children, 2);

    var nameNode = _node$children[0];
    var valueNode = _node$children[1];


    assertNameNode(nameNode);

    return {
      type: type,
      name: nameNode.value,
      value: reduceTypeNode(valueNode)
    };
  };

  var reduceSpreadNode = function reduceSpreadNode(node) {
    assertNodeType(node, NODE_TYPE_SPREAD);

    var type = node.type;

    var _node$children2 = _slicedToArray(node.children, 1);

    var nameNode = _node$children2[0];


    assertNameNode(nameNode);
    assertSpreadableTypeName(nameNode.value);

    return {
      type: type,
      value: namedPropTypes[nameNode.value]
    };
  };

  var reduceUnionNode = function reduceUnionNode(node) {
    assertNodeType(node, NODE_TYPE_UNION);

    var _node$children3 = _slicedToArray(node.children, 2);

    var left = _node$children3[0];
    var right = _node$children3[1];


    return PropTypes.oneOfType([reduceTypeNode(left), reduceTypeNode(right)]);
  };

  var reduceListTypeNode = function reduceListTypeNode(node) {
    // TODO could be enums.
    assertNodeType(node, NODE_TYPE_LIST);

    if (node.children.length !== 1) {
      console.error(node);
      throw new Error('List type should have only one child.');
    }

    var _node$children4 = _slicedToArray(node.children, 1);

    var typeNode = _node$children4[0];


    return PropTypes.arrayOf(reduceTypeNode(typeNode));
  };

  var reduceGroupNode = function reduceGroupNode(node) {
    assertNodeType(node, NODE_TYPE_GROUP);

    if (node.children.length !== 1) {
      console.error(node);
      throw new Error('Group type should have only one child.');
    }

    var _node$children5 = _slicedToArray(node.children, 1);

    var typeNode = _node$children5[0];

    return reduceTypeNode(typeNode);
  };

  var reduceShapeNode = function reduceShapeNode(node) {
    assertNodeType(node, NODE_TYPE_SHAPE);

    var type = node.type;
    var children = node.children;

    if (!children.length) {
      console.error(node);
      throw new Error('Empty shape.');
    }

    var shape = createCleanObject();

    children.forEach(function (node) {
      var childType = node.type;
      var name = node.name;
      var value = node.value;

      switch (childType) {
        case NODE_TYPE_SPREAD:
          copy(shape, value);
          break;
        case NODE_TYPE_ASSIGNMENT:
          shape[name] = value;
          break;
        default:
          console.error(node);
          throw new Error('Unexpected type inside shape. ' + childType);
      }
    });

    return {
      type: type,
      value: shape
    };
  };

  var reduceTreeToPropTypes = function reduceTreeToPropTypes(root) {
    return reduceTreePostOrder(root, function (node) {
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
          throw new Error('Unknown node type. \'' + node.type + '\'');
      }
    });
  };

  var buildTreeByGrouping = function buildTreeByGrouping(tokens) {
    var node = {
      children: []
    };
    for (var i = 0; i < tokens.length; i++) {
      var token = tokens[i];
      var child = void 0;
      if (GROUPS[token]) {
        var group = GROUPS[token];
        var innerTokens = getInnerTokens(tokens, token, group.closing, i + 1);
        child = _extends({}, group, buildTreeByGrouping(innerTokens));
        if (token === CHAR_SHAPE_OPEN) {
          //child.children = splitAssignments(child.children);
        }
        i += innerTokens.length + 1;
      } else {
        var lastChild = void 0;
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

  var parseType = function parseType(tokens) {
    var isRequired = last(tokens) === OPERATOR_REQUIRED;
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

  var parseShapeNode = function parseShapeNode(_ref2) {
    var children = _ref2.children;

    if (!children.length) throw new Error('Empty shape.');

    var shape = {};

    var state = STATE_NEED_NAME;
    var name = null;
    for (var i = 0; i < children.length; i++) {
      var _children$i = children[i];
      var type = _children$i.type;
      var _value2 = _children$i.value;

      var innerTokens = void 0;

      switch (state) {

        case STATE_NEED_NAME:
          if (type !== NODE_TYPE_LEAF) {
            throw new Error('Expected valid name. Instead, saw \'' + type + '\' node.');
          }

          if (spreadRegexp.test(_value2)) {
            name = _value2.substring(3);
            if (!namedPropTypes[name]) {
              throw new Error('Unknown type to spread. name=' + name);
            }

            copy(shape, namedPropTypes[name]);
            state = STATE_NEED_NAME;
          } else {
            if (!isValidName(_value2)) {
              throw new Error('Expected valid name. Instead, saw \'' + _value2 + '\'.');
            }

            name = _value2;
            state = STATE_NEED_NAME_COLON;
          }
          break;

        case STATE_NEED_NAME_COLON:
          if (_value2 !== OPERATOR_ASSIGNMENT) {
            throw new Error('Expected colon after name=\'' + name + '\'. Instead, saw \'' + _value2 + '\'.');
          }
          state = STATE_NEED_TYPE;
          break;

        case STATE_NEED_TYPE:
          var NODE_TYPE_LEAF = 'LEAF';
          var NODE_TYPE_LIST = 'LIST';
          var NODE_TYPE_SHAPE = 'SHAPE';
          var NODE_TYPE_GROUP = 'GROUP';
          var NODE_TYPE_QUOTE = 'QUOTE';
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
              shape[name] = getType(_value2);
              break;
          }

          state = STATE_SEEN_TYPE;
          break;

        case STATE_SEEN_TYPE:
          switch (_value2) {
            case OPERATOR_REQUIRED:
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

  var parseShape = function parseShape(tokens) {
    if (!tokens.length) throw new Error('Empty shape.');

    var shape = {};

    var state = STATE_NEED_NAME;
    var name = null;
    for (var i = 0; i < tokens.length; i++) {
      var _value3 = tokens[i];
      var innerTokens = void 0;

      switch (state) {

        case STATE_NEED_NAME:
          if (spreadRegexp.test(_value3)) {
            name = _value3.substring(3);
            if (!namedPropTypes[name]) {
              throw new Error('Unknown type to spread. name=' + name);
            }

            copy(shape, namedPropTypes[name]);
            state = STATE_NEED_NAME;
          } else {
            if (!isValidName(_value3)) {
              throw new Error('Expected valid name. Instead, saw \'' + _value3 + '\'.');
            }

            name = _value3;
            state = STATE_NEED_NAME_COLON;
          }
          break;

        case STATE_NEED_NAME_COLON:
          if (_value3 !== OPERATOR_ASSIGNMENT) {
            throw new Error('Expected colon after name=\'' + name + '\'. Instead, saw \'' + _value3 + '\'.');
          }
          state = STATE_NEED_TYPE;
          break;

        case STATE_NEED_TYPE:
          switch (_value3) {
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
              shape[name] = getType(_value3);
              break;
          }

          state = STATE_SEEN_TYPE;
          break;

        case STATE_SEEN_TYPE:
          switch (_value3) {
            case OPERATOR_REQUIRED:
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

  var parser = function parser(string, typeOverrides) {
    var tokens = string.replace(punctuatorRegexp, ' $1 ').split(/[\n\s,;]+/g).filter(function (x) {
      return x;
    });

    console.log('tokens', tokens.join(' '));

    var name = void 0;
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
      throw new Error('\'' + name + '\' type is already defined.');
    }

    var node = buildTreeByGrouping(tokens);
    transformTreeWithOperators(node);

    if (node.children.length !== 1) {
      throw new Error('Only one definition is allowed.');
    }

    var _node$children6 = _slicedToArray(node.children, 1);

    var shapeNode = _node$children6[0];

    assertNodeType(shapeNode, NODE_TYPE_SHAPE);

    var propTypesFromTree = reduceTreeToPropTypes(shapeNode).value;
    console.log(propTypesFromTree);

    if (name) addPropTypes(name, propTypesFromTree);
    return propTypesFromTree;

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