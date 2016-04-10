import createPropTypes from '../index';
import {PropTypes} from 'react';

const assert = require('assert');

const log = (value) => console.log(JSON.stringify(value, null, '  '));

const testPass = (propType, value) => {
  assert.equal(
    null,
    propType({testProp: value}, 'testProp')
  );
};

const testFail = (propType, value) => {
  assert.equal(
    true,
    propType({testProp: value}, 'testProp') instanceof Error
  );
};

describe('PropTypes', () => {
  it('should successfully parse and return valid propTypes.', () => {
    class Message {}

    const propTypes = createPropTypes(PropTypes, {
      Message,
    })(`{
      number: Number
      string: String!
      boolean: Boolean
      function: Function!
      date: Date!
      object: Object!
      shape: {
        nested: Number
        array: [Number]
        must: Boolean!
      }!
      array: [Number!]!
      arrayOfObjects: [{
        value: String
      }!]
      node: Node
      element: Element!
      message: Message!
      any: Any!
    }`);

    assert.equal(propTypes.number, PropTypes.number);

    assert.equal(propTypes.string, PropTypes.string.isRequired);

    assert.equal(propTypes.boolean, PropTypes.bool);

    assert.equal(propTypes.function, PropTypes.func.isRequired);

    testPass(propTypes.date, new Date());
    testFail(propTypes.date, null);
    testFail(propTypes.date, Date);
    testFail(propTypes.date, 1);

    assert.equal(propTypes.object, PropTypes.object.isRequired);

    testPass(propTypes.shape, {
      nested: 3,
      array: [1, 2],
      must: true,
    });
    testPass(propTypes.shape, {
      nested: null,
      array: [null, 3],
      must: false,
    });
    testPass(propTypes.shape, {
      nested: null,
      array: null,
      must: false,
    });
    testFail(propTypes.shape, {
      nested: '3',
      array: null,
      must: false,
    });
    testFail(propTypes.shape, {
      nested: 3,
      array: ['3'],
      must: false,
    });
    testFail(propTypes.shape, null);

    testPass(propTypes.array, [3]);
    testPass(propTypes.array, []);
    testFail(propTypes.array, null);
    testFail(propTypes.array, [null]);
    testFail(propTypes.array, [3, '3']);

    testPass(propTypes.arrayOfObjects, [{value: ''}]);
    testPass(propTypes.arrayOfObjects, [{value: '', a: 3}]);
    testPass(propTypes.arrayOfObjects, [{value: null}]);
    testPass(propTypes.arrayOfObjects, [{}]);
    testPass(propTypes.arrayOfObjects, null);
    testFail(propTypes.arrayOfObjects, [null]);

    assert.equal(propTypes.node, PropTypes.node);
    assert.equal(propTypes.element, PropTypes.element.isRequired);

    testPass(propTypes.message, new Message());
    testFail(propTypes.message, null);
    testFail(propTypes.message, Message);
    testFail(propTypes.message, new Date());

    assert.equal(propTypes.any, PropTypes.any.isRequired);
  });
});
