# proptypes-parser
Don't you just hate writing PropTypes for React components?
`proptypes-parser` is cleaner, easier and less error prone way to define your PropTypes for both React and React Native applications.
It uses GraphQL schema like syntax to define PropTypes in string.


### Install
```
npm install --save proptypes-parser
```


### Usage
```
import createPropTypesParser from 'proptypes-parser';
import {PropTypes} from 'react';

const parsePropTypes = createPropTypesParser(PropTypes);

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
}`);
```

Above is equivalent to:
```
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
};
```
How wonderful!


### Union and Enums
Currently, Union and Enums are not supported.
However, you can do this instead:
```
// Provide type extensions for this parser.
const parsePropTypes = createPropTypesParser(PropTypes, {
  OptionalEnum: PropTypes.oneOf(['News', 'Photos']),
  OptionalUnion: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
    PropTypes.instanceOf(Message),
  ]),
});

const propTypes = parsePropTypes(`{
  optionalEnumValue: OptionalEnum
  requiredEnumValue: OptionalEnum!
  unionValue: OptionalUnion
  arrayUnionValue: [OptionalUnion!]!
}`);
```
or
```
// Provide local one-time type extensions.
const propTypes = parsePropTypes(`{
  optionalEnumValue: OptionalEnum
  requiredEnumValue: OptionalEnum!
  unionValue: OptionalUnion
  arrayUnionValue: [OptionalUnion!]!
}`, {
  OptionalEnum: PropTypes.oneOf(['News', 'Photos']),
  OptionalUnion: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
    PropTypes.instanceOf(Message),
  ]),
});
```


### TODO
 - Support Union: `value: (Number | String)!`
 - Support Enums: `value: ['News', 'Photos']`
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
