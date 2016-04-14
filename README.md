# proptypes-parser
PropTypes parser / generator for React and React Native components with GraphQL-like syntax.

Don't you just hate writing PropTypes for React components?

`proptypes-parser` is cleaner, easier and less error prone way to define your PropTypes for both React and React Native applications.

It uses GraphQL schema like syntax to define PropTypes in string.

It also allows Type Composition via named definitions and spread operator `...`!


### Install
```
npm install --save proptypes-parser
```


### Usage
in `proptypes.js`.
```javascript
import createPropTypesParser from 'proptypes-parser';
import {PropTypes} from 'react';

// Provide PropTypes to the parser (Required).
// Also, provide any custom type definitions (Optional).
export default createPropTypesParser(PropTypes, {
  Message: class Message {} // To use 'Message' instance type. 
});
```

in `component.js`.
```javascript
import parsePropTypes from './proptypes';

const propTypes = parsePropTypes(`{
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
  union: (String | Number)!
}`);
```

is equivalent to
```javascript
const propTypes = {
  number: PropTypes.number,
  string: PropTypes.string.isRequired,
  boolean: PropTypes.bool,
  function: PropTypes.func.isRequired,
  date: PropTypes.instanceOf(Date).isRequired,
  object: PropTypes.object.isRequired,
  shape: PropTypes.shape({
    nested: PropTypes.number,
    array: PropTypes.arrayOf(PropTypes.number),
    must: PropTypes.bool.isRequired,
  }).isRequired,
  array: PropTypes.arrayOf(
    PropTypes.Number.isRequired,
  ).isRequired,
  arrayOfObjects: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string,
    }).isRequired
  ),
  node: PropTypes.node
  element: PropTypes.element.isRequired,
  message: PropTypes.instanceOf(Message).isRequired,
  any: PropTypes.any.isRequired,
  union: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
  ]).isRequired,
};
```
How wonderful!


### Composition via named definition
Compose types with named definitions and spread operator `...`.

```javascript
// Define 'Car' type.
const carPropTypes = parsePropTypes(`
  Car {
    year: Number!
    model: String!
  }
`);

// Use previously defined 'Car' type.
const garagePropTypes = parsePropTypes(`
  Garage {
    address: String!
    cars: [Car!]!
  }
`);

// Use spread operator on 'Car' type.
const carWithMakePropTypes = parsePropTypes(`
  CarWithMake {
    ...Car
    make: String!
  }
`);
```

### addType(name, type)
Add new types to the type dictionary.
```javascript
// Add class instance type.
class Message {}
parsePropTypes.addType('Message', Message);

// Add propTypes definition.
// Same as named definition.
const carPropTypes = parsePropTypes(`{
  year: Number!
  model: String!
}`);
parsePropTypes.addType('Car', carPropTypes);

// Add React.PropTypes type.
const newsOrPhotosEnum = PropTypes.oneOf(['News', 'Photos']);
parsePropTypes.addType('NewsOrPhotos', newsOrPhotosEnum);

// Use above types.
parsePropTypes(`{
  message: Message
  car: Car
  mediaType: NewsOrPhotos
}`);

```

### Enums
Currently, Enums are not supported.
However, you can do this instead:
```javascript
// Provide type extensions for this parser.
const parsePropTypes = createPropTypesParser(PropTypes, {
  OptionalEnum: PropTypes.oneOf(['News', 'Photos']),
});

const propTypes = parsePropTypes(`{
  optionalEnumValue: OptionalEnum
  requiredEnumValue: OptionalEnum!
}`);
```
or
```javascript
// Provide local one-time type extensions.
const propTypes = parsePropTypes(`{
  optionalEnumValue: OptionalEnum
  requiredEnumValue: OptionalEnum!
}`, {
  OptionalEnum: PropTypes.oneOf(['News', 'Photos']),
});
```

### Examples
See [test](https://github.com/joonhocho/proptypes-parser/blob/master/src/test/index.js).


### Production Use
Currently, module returns a no-op function for production (`process.env.NODE_ENV === 'production'`).
In the future, it will be nice to do more interesting things with babel and webpack via plugins (PR is welcome!).

Take a look at the [source code](https://github.com/joonhocho/proptypes-parser/blob/master/src/index.js).


### TODO
 - Support Enums: `value: ['News', 'Photos']`
 - More extensive validations
 - Babel plugin
 - Webpack plugin
 - PRs are welcome!


### License
```
The MIT License (MIT)

Copyright (c) 2016 Joon Ho Cho

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
