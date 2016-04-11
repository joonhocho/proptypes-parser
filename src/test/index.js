import createParser from '../index';
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

    const propTypes = createParser(PropTypes, {Message})(`{
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


  it('should allow local type overrides.', () => {
    class Message {}

    const parsePropTypes = createParser(PropTypes, {Message});

    class LocalDate {}
    class LocalElement {}
    class LocalMessage {}

    const propTypes = parsePropTypes(`{
      date: Date
      element: Element
      message: Message
    }`, {
      Date: LocalDate,
      Element: LocalElement,
      Message: LocalMessage,
    });

    testPass(propTypes.date, new LocalDate());
    testFail(propTypes.date, new Date());

    testPass(propTypes.element, new LocalElement());
    assert.notEqual(propTypes.element, PropTypes.element);

    testFail(propTypes.message, new Message());
    testPass(propTypes.message, new LocalMessage());
  });


  it('should allow manually adding PropTypes.', () => {
    class Message {}

    const propTypes = createParser(PropTypes, {
      OptionalEnum: PropTypes.oneOf(['News', 'Photos']),
      OptionalUnion: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.number,
        PropTypes.instanceOf(Message),
      ]),
    })(`{
      optionalEnumValue: OptionalEnum
      requiredEnumValue: OptionalEnum!
      unionValue: OptionalUnion
      arrayUnionValue: [OptionalUnion!]!
    }`);

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


  it('should accept named PropTypes definition.', () => {
    const parser = createParser(PropTypes);

    const propTypes = parser(`
      Car {
        year: Number!
        model: String!
      }
    `);

    assert.equal(propTypes, parser.getPropTypes('Car'));

    assert.equal(propTypes.year, PropTypes.number.isRequired);
    assert.equal(propTypes.model, PropTypes.string.isRequired);
  });


  it('should not allow name collisions.', () => {
    const parser = createParser(PropTypes);

    assert.throws(() => {
      // Cannot override default type, String.
      const propTypes = parser(`
        String {
          year: Number!
          model: String!
        }
      `);
    }, /already defined/i);

    const propTypes = parser(`
      Car {
        year: Number!
        model: String!
      }
    `);

    assert.throws(() => {
      // Cannot override previously defined, Car.
      const propTypes = parser(`
        Car {
          year: Number!
          model: String!
          wheelCount: Number!
        }
      `);
    }, /already defined/i);
  });


  it('should allow composition with named PropTypes definitions.', () => {
    const parser = createParser(PropTypes);

    const carPropTypes = parser(`
      Car {
        year: Number!
        model: String!
      }
    `);

    const garagePropTypes = parser(`
      Garage {
        address: String!
        cars: [Car!]!
      }
    `);

    testPass(garagePropTypes.cars, [{year: 2014, model: 'Model 3'}]);
    testPass(garagePropTypes.cars, [{year: 2014, model: 'Model 3', make: 'Tesla'}]);
    testPass(garagePropTypes.cars, []);
    testFail(garagePropTypes.cars, [{model: 'Model 3'}]);
    testFail(garagePropTypes.cars, [null]);
    testFail(garagePropTypes.cars, null);
  });


  it('should allow composition with spread operator.', () => {
    const parser = createParser(PropTypes);

    assert.throws(() => {
      // Cannot spread unknown type.
      const carWithMakePropTypes = parser(`
        CarWithMake {
          ...Car
          make: String!
        }
      `);
    }, /unknown type/i);

    const carPropTypes = parser(`
      Car {
        year: Number!
        model: String!
      }
    `);

    const carWithMakePropTypes = parser(`
      CarWithMake {
        ...Car
        make: String!
      }
    `);

    // carPropTypes stays untouched.
    assert.equal(carPropTypes.make, undefined);

    // Inherited from Car
    assert.equal(carWithMakePropTypes.year, PropTypes.number.isRequired);
    assert.equal(carWithMakePropTypes.model, PropTypes.string.isRequired);

    // Additional field
    assert.equal(carWithMakePropTypes.make, PropTypes.string.isRequired);
  });
});
