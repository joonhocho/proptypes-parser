import {describe, it} from 'mocha';
import {expect} from 'chai';
import createParser, {
  PropTypes,
  parsePropTypes as defaultParser,
  PT as defaultPT,
} from '../lib';


const log = (value) => console.log(JSON.stringify(value, null, '  '));

const testPass = (propType, value) => {
  expect(propType({testProp: value}, 'testProp')).to.be.null;
};

const testFail = (propType, value) => {
  expect(propType({testProp: value}, 'testProp')).to.be.an.instanceof(Error);
};


describe('PropTypes', () => {
  it('should provide default parsePropTypes.', () => {
    const propTypes = defaultParser(`{
      number: Number
      string: String!
      boolean: Boolean
    }`);

    expect(propTypes.number).to.equal(PropTypes.number);

    expect(propTypes.string).to.equal(PropTypes.string.isRequired);

    expect(propTypes.boolean).to.equal(PropTypes.bool);
  });


  it('should provide default PT.', () => {
    const propTypes = defaultPT`{
      number: Number
      string: String!
      boolean: Boolean
    }`;

    expect(propTypes.number).to.equal(PropTypes.number);

    expect(propTypes.string).to.equal(PropTypes.string.isRequired);

    expect(propTypes.boolean).to.equal(PropTypes.bool);
  });


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

    expect(propTypes.number).to.equal(PropTypes.number);

    expect(propTypes.string).to.equal(PropTypes.string.isRequired);

    expect(propTypes.boolean).to.equal(PropTypes.bool);

    expect(propTypes.function).to.equal(PropTypes.func.isRequired);

    testPass(propTypes.date, new Date());
    testFail(propTypes.date, null);
    testFail(propTypes.date, Date);
    testFail(propTypes.date, 1);

    expect(propTypes.object).to.equal(PropTypes.object.isRequired);

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

    expect(propTypes.node).to.equal(PropTypes.node);
    expect(propTypes.element).to.equal(PropTypes.element.isRequired);

    testPass(propTypes.message, new Message());
    testFail(propTypes.message, null);
    testFail(propTypes.message, Message);
    testFail(propTypes.message, new Date());

    expect(propTypes.any).to.equal(PropTypes.any.isRequired);
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
    expect(propTypes.element).to.not.equal(PropTypes.element);

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

    expect(propTypes).to.equal(parser.getPropTypes('Car'));

    expect(propTypes.year).to.equal(PropTypes.number.isRequired);
    expect(propTypes.model).to.equal(PropTypes.string.isRequired);
  });


  it('should not allow name collisions.', () => {
    const parser = createParser(PropTypes);

    expect(() => {
      // Cannot override default type, String.
      const propTypes = parser(`
        String {
          year: Number!
          model: String!
        }
      `);
    }).to.throw(/already defined/i);

    const propTypes = parser(`
      Car {
        year: Number!
        model: String!
      }
    `);

    expect(() => {
      // Cannot override previously defined, Car.
      const propTypes = parser(`
        Car {
          year: Number!
          model: String!
          wheelCount: Number!
        }
      `);
    }).to.throw(/already defined/i);
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

    expect(() => {
      // Cannot spread unknown type.
      const carWithMakePropTypes = parser(`
        CarWithMake {
          ...Car
          make: String!
        }
      `);
    }).to.throw(/unknown type/i);

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
    expect(carPropTypes.make).to.be.undefined;

    // Inherited from Car
    expect(carWithMakePropTypes.year).to.equal(PropTypes.number.isRequired);
    expect(carWithMakePropTypes.model).to.equal(PropTypes.string.isRequired);

    // Additional field
    expect(carWithMakePropTypes.make).to.equal(PropTypes.string.isRequired);
  });


  it('should allow adding types.', () => {
    const parser = createParser(PropTypes);

    class Message {}

    expect(() => {
      parser(`{ message: Message }`);
    }).to.throw(/Message/i);

    parser.addType('Message', Message);

    const propTypes = parser(`{ message: Message }`);

    testPass(propTypes.message, new Message());
    testPass(propTypes.message, null);
    testFail(propTypes.message, Message);
    testFail(propTypes.message, {});
  });


  it('should allow adding propTypes.', () => {
    const parser = createParser(PropTypes);

    expect(() => {
      parser(`{ message: Message }`);
    }).to.throw(/Message/i);

    const messagePropTypes = parser(`{
      from: String!
      to: String!
      text: String!
    }`);

    parser.addType('Message', messagePropTypes);

    const propTypes = parser(`{ message: Message }`);

    testPass(propTypes.message, {
      from: 'me',
      to: 'you',
      text: 'hi',
    });

    testFail(propTypes.message, {
      from: 'me',
      text: 'hi',
    });

    const messagePropTypesWithDate = parser(`{
      ...Message
      date: Date!
    }`);

    expect(messagePropTypesWithDate.text).to.equal(PropTypes.string.isRequired);
    testPass(messagePropTypesWithDate.date, new Date());
    testFail(messagePropTypesWithDate.date, null);

    parser.addType('NewsOrPhotos', PropTypes.oneOf(['News', 'Photos']));
    const propTypesWithEnum = parser(`{
      mediaType: NewsOrPhotos
    }`);

    testPass(propTypesWithEnum.mediaType, undefined);
    testPass(propTypesWithEnum.mediaType, 'News');
    testPass(propTypesWithEnum.mediaType, 'Photos');
    testFail(propTypesWithEnum.mediaType, 'Video');
  });


  it('should support union type.', () => {
    const parser = createParser(PropTypes);

    const propTypes = parser(`{
      stringOrNumberOrNull: String | Number
      stringOrNumber: String! | Number!
      stringOrNumberGroup: (String | Number)!
      stringOrNumberOrBoolean: (String | Number | Boolean)!
      stringOrNumberOrBoolean2: ((String | Number)! | Boolean)!
    }`);

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
