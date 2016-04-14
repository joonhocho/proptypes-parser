'use strict';

var _index = require('../index');

var _index2 = _interopRequireDefault(_index);

var _react = require('react');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var assert = require('assert');

var log = function log(value) {
  return console.log(JSON.stringify(value, null, '  '));
};

var testPass = function testPass(propType, value) {
  assert.equal(null, propType({ testProp: value }, 'testProp'));
};

var testFail = function testFail(propType, value) {
  assert.equal(true, propType({ testProp: value }, 'testProp') instanceof Error);
};

describe('PropTypes', function () {
  it('should successfully parse and return valid propTypes.', function () {
    var Message = function Message() {
      _classCallCheck(this, Message);
    };

    var propTypes = (0, _index2.default)(_react.PropTypes, { Message: Message })('{\n      number: Number\n      string: String!\n      boolean: Boolean\n      function: Function!\n      date: Date!\n      object: Object!\n      shape: {\n        nested: Number\n        array: [Number]\n        must: Boolean!\n      }!\n      array: [Number!]!\n      arrayOfObjects: [{\n        value: String\n      }!]\n      node: Node\n      element: Element!\n      message: Message!\n      any: Any!\n    }');

    assert.equal(propTypes.number, _react.PropTypes.number);

    assert.equal(propTypes.string, _react.PropTypes.string.isRequired);

    assert.equal(propTypes.boolean, _react.PropTypes.bool);

    assert.equal(propTypes.function, _react.PropTypes.func.isRequired);

    testPass(propTypes.date, new Date());
    testFail(propTypes.date, null);
    testFail(propTypes.date, Date);
    testFail(propTypes.date, 1);

    assert.equal(propTypes.object, _react.PropTypes.object.isRequired);

    testPass(propTypes.shape, {
      nested: 3,
      array: [1, 2],
      must: true
    });
    testPass(propTypes.shape, {
      nested: null,
      array: [null, 3],
      must: false
    });
    testPass(propTypes.shape, {
      nested: null,
      array: null,
      must: false
    });
    testFail(propTypes.shape, {
      nested: '3',
      array: null,
      must: false
    });
    testFail(propTypes.shape, {
      nested: 3,
      array: ['3'],
      must: false
    });
    testFail(propTypes.shape, null);

    testPass(propTypes.array, [3]);
    testPass(propTypes.array, []);
    testFail(propTypes.array, null);
    testFail(propTypes.array, [null]);
    testFail(propTypes.array, [3, '3']);

    testPass(propTypes.arrayOfObjects, [{ value: '' }]);
    testPass(propTypes.arrayOfObjects, [{ value: '', a: 3 }]);
    testPass(propTypes.arrayOfObjects, [{ value: null }]);
    testPass(propTypes.arrayOfObjects, [{}]);
    testPass(propTypes.arrayOfObjects, null);
    testFail(propTypes.arrayOfObjects, [null]);

    assert.equal(propTypes.node, _react.PropTypes.node);
    assert.equal(propTypes.element, _react.PropTypes.element.isRequired);

    testPass(propTypes.message, new Message());
    testFail(propTypes.message, null);
    testFail(propTypes.message, Message);
    testFail(propTypes.message, new Date());

    assert.equal(propTypes.any, _react.PropTypes.any.isRequired);
  });

  it('should allow local type overrides.', function () {
    var Message = function Message() {
      _classCallCheck(this, Message);
    };

    var parsePropTypes = (0, _index2.default)(_react.PropTypes, { Message: Message });

    var LocalDate = function LocalDate() {
      _classCallCheck(this, LocalDate);
    };

    var LocalElement = function LocalElement() {
      _classCallCheck(this, LocalElement);
    };

    var LocalMessage = function LocalMessage() {
      _classCallCheck(this, LocalMessage);
    };

    var propTypes = parsePropTypes('{\n      date: Date\n      element: Element\n      message: Message\n    }', {
      Date: LocalDate,
      Element: LocalElement,
      Message: LocalMessage
    });

    testPass(propTypes.date, new LocalDate());
    testFail(propTypes.date, new Date());

    testPass(propTypes.element, new LocalElement());
    assert.notEqual(propTypes.element, _react.PropTypes.element);

    testFail(propTypes.message, new Message());
    testPass(propTypes.message, new LocalMessage());
  });

  it('should allow manually adding PropTypes.', function () {
    var Message = function Message() {
      _classCallCheck(this, Message);
    };

    var propTypes = (0, _index2.default)(_react.PropTypes, {
      OptionalEnum: _react.PropTypes.oneOf(['News', 'Photos']),
      OptionalUnion: _react.PropTypes.oneOfType([_react.PropTypes.string, _react.PropTypes.number, _react.PropTypes.instanceOf(Message)])
    })('{\n      optionalEnumValue: OptionalEnum\n      requiredEnumValue: OptionalEnum!\n      unionValue: OptionalUnion\n      arrayUnionValue: [OptionalUnion!]!\n    }');

    testPass(propTypes.optionalEnumValue, 'News');
    testPass(propTypes.optionalEnumValue, 'Photos');
    testPass(propTypes.optionalEnumValue, null);
    testFail(propTypes.optionalEnumValue, 'Others');

    testPass(propTypes.requiredEnumValue, 'News');
    testPass(propTypes.requiredEnumValue, 'Photos');
    testFail(propTypes.requiredEnumValue, null);
    testFail(propTypes.requiredEnumValue, 'Others');

    testPass(propTypes.unionValue, '1');
    testPass(propTypes.unionValue, 1);
    testPass(propTypes.unionValue, new Message());
    testPass(propTypes.unionValue, null);
    testFail(propTypes.unionValue, true);

    testPass(propTypes.arrayUnionValue, ['1']);
    testPass(propTypes.arrayUnionValue, [1]);
    testPass(propTypes.arrayUnionValue, [new Message()]);
    testPass(propTypes.arrayUnionValue, []);
    testFail(propTypes.arrayUnionValue, [null]);
  });

  it('should accept named PropTypes definition.', function () {
    var parser = (0, _index2.default)(_react.PropTypes);

    var propTypes = parser('\n      Car {\n        year: Number!\n        model: String!\n      }\n    ');

    assert.equal(propTypes, parser.getPropTypes('Car'));

    assert.equal(propTypes.year, _react.PropTypes.number.isRequired);
    assert.equal(propTypes.model, _react.PropTypes.string.isRequired);
  });

  it('should not allow name collisions.', function () {
    var parser = (0, _index2.default)(_react.PropTypes);

    assert.throws(function () {
      // Cannot override default type, String.
      var propTypes = parser('\n        String {\n          year: Number!\n          model: String!\n        }\n      ');
    }, /already defined/i);

    var propTypes = parser('\n      Car {\n        year: Number!\n        model: String!\n      }\n    ');

    assert.throws(function () {
      // Cannot override previously defined, Car.
      var propTypes = parser('\n        Car {\n          year: Number!\n          model: String!\n          wheelCount: Number!\n        }\n      ');
    }, /already defined/i);
  });

  it('should allow composition with named PropTypes definitions.', function () {
    var parser = (0, _index2.default)(_react.PropTypes);

    var carPropTypes = parser('\n      Car {\n        year: Number!\n        model: String!\n      }\n    ');

    var garagePropTypes = parser('\n      Garage {\n        address: String!\n        cars: [Car!]!\n      }\n    ');

    testPass(garagePropTypes.cars, [{ year: 2014, model: 'Model 3' }]);
    testPass(garagePropTypes.cars, [{ year: 2014, model: 'Model 3', make: 'Tesla' }]);
    testPass(garagePropTypes.cars, []);
    testFail(garagePropTypes.cars, [{ model: 'Model 3' }]);
    testFail(garagePropTypes.cars, [null]);
    testFail(garagePropTypes.cars, null);
  });

  it('should allow composition with spread operator.', function () {
    var parser = (0, _index2.default)(_react.PropTypes);

    assert.throws(function () {
      // Cannot spread unknown type.
      var carWithMakePropTypes = parser('\n        CarWithMake {\n          ...Car\n          make: String!\n        }\n      ');
    }, /unknown type/i);

    var carPropTypes = parser('\n      Car {\n        year: Number!\n        model: String!\n      }\n    ');

    var carWithMakePropTypes = parser('\n      CarWithMake {\n        ...Car\n        make: String!\n      }\n    ');

    // carPropTypes stays untouched.
    assert.equal(carPropTypes.make, undefined);

    // Inherited from Car
    assert.equal(carWithMakePropTypes.year, _react.PropTypes.number.isRequired);
    assert.equal(carWithMakePropTypes.model, _react.PropTypes.string.isRequired);

    // Additional field
    assert.equal(carWithMakePropTypes.make, _react.PropTypes.string.isRequired);
  });

  it('should allow adding types.', function () {
    var parser = (0, _index2.default)(_react.PropTypes);

    var Message = function Message() {
      _classCallCheck(this, Message);
    };

    assert.throws(function () {
      parser('{ message: Message }');
    }, /Message/i);

    parser.addType('Message', Message);

    var propTypes = parser('{ message: Message }');

    testPass(propTypes.message, new Message());
    testPass(propTypes.message, null);
    testFail(propTypes.message, Message);
    testFail(propTypes.message, {});
  });

  it('should allow adding propTypes.', function () {
    var parser = (0, _index2.default)(_react.PropTypes);

    assert.throws(function () {
      parser('{ message: Message }');
    }, /Message/i);

    var messagePropTypes = parser('{\n      from: String!\n      to: String!\n      text: String!\n    }');

    parser.addType('Message', messagePropTypes);

    var propTypes = parser('{ message: Message }');

    testPass(propTypes.message, {
      from: 'me',
      to: 'you',
      text: 'hi'
    });

    testFail(propTypes.message, {
      from: 'me',
      text: 'hi'
    });

    var messagePropTypesWithDate = parser('{\n      ...Message\n      date: Date!\n    }');

    assert.equal(messagePropTypesWithDate.text, _react.PropTypes.string.isRequired);
    testPass(messagePropTypesWithDate.date, new Date());
    testFail(messagePropTypesWithDate.date, null);

    parser.addType('NewsOrPhotos', _react.PropTypes.oneOf(['News', 'Photos']));
    var propTypesWithEnum = parser('{\n      mediaType: NewsOrPhotos\n    }');

    testPass(propTypesWithEnum.mediaType, undefined);
    testPass(propTypesWithEnum.mediaType, 'News');
    testPass(propTypesWithEnum.mediaType, 'Photos');
    testFail(propTypesWithEnum.mediaType, 'Video');
  });

  it('should support union type.', function () {
    var parser = (0, _index2.default)(_react.PropTypes);

    var propTypes = parser('{\n      stringOrNumberOrNull: String | Number\n      stringOrNumber: String! | Number!\n      stringOrNumberGroup: (String | Number)!\n      stringOrNumberOrBoolean: (String | Number | Boolean)!\n      stringOrNumberOrBoolean2: ((String | Number)! | Boolean)!\n    }');

    testPass(propTypes.stringOrNumberOrNull, 'a');
    testPass(propTypes.stringOrNumberOrNull, 1);
    testPass(propTypes.stringOrNumberOrNull, null);
    testFail(propTypes.stringOrNumberOrNull, true);

    testPass(propTypes.stringOrNumber, 'a');
    testPass(propTypes.stringOrNumber, 1);
    testFail(propTypes.stringOrNumber, null);
    testFail(propTypes.stringOrNumber, true);

    testPass(propTypes.stringOrNumberGroup, 'a');
    testPass(propTypes.stringOrNumberGroup, 1);
    testFail(propTypes.stringOrNumberGroup, null);
    testFail(propTypes.stringOrNumberGroup, true);

    testPass(propTypes.stringOrNumberOrBoolean, 'a');
    testPass(propTypes.stringOrNumberOrBoolean, 1);
    testPass(propTypes.stringOrNumberOrBoolean, true);
    testFail(propTypes.stringOrNumberOrBoolean, null);
    testFail(propTypes.stringOrNumberOrBoolean, undefined);
    testFail(propTypes.stringOrNumberOrBoolean, []);
    testFail(propTypes.stringOrNumberOrBoolean, {});

    testPass(propTypes.stringOrNumberOrBoolean2, 'a');
    testPass(propTypes.stringOrNumberOrBoolean2, 1);
    testPass(propTypes.stringOrNumberOrBoolean2, true);
    testFail(propTypes.stringOrNumberOrBoolean2, null);
    testFail(propTypes.stringOrNumberOrBoolean2, undefined);
    testFail(propTypes.stringOrNumberOrBoolean2, []);
    testFail(propTypes.stringOrNumberOrBoolean2, {});
  });
});