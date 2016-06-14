import React, {Component} from 'react';
import {PT} from '../../lib';

class ES6 extends Component {
  static propTypes = PT`{
    value: Number!
  }`;
  render() {
    return (<div/>);
  }
}


const ES5 = React.createClass({
  propTypes: PT`{
    value: Number!
  }`,
  render: function() {
    return (<div/>);
  },
});


class ES6Assign extends Component {
  render() {
    return (<div/>);
  }
}
ES6Assign.propTypes = PT`{
  value: Number!
}`;


const ES5Assign = React.createClass({
  render: function() {
    return (<div/>);
  }
});
ES5Assign.propTypes = PT`{
  value: Number!
}`;


function FuncAssign() {
  return (<div/>);
}
FuncAssign.propTypes = PT`{
  value: Number!
}`;


class ES6VarAssign extends Component {
  render() {
    return (<div/>);
  }
}
const fPropTypes = PT`{
  value: Number!
}`;
ES6VarAssign.propTypes = fPropTypes;


export {
  ES6, ES5, ES6Assign, ES5Assign, FuncAssign, ES6VarAssign,
};
