import {describe, it} from 'mocha';
import {expect} from 'chai';
import {ES6, ES5, ES6Assign, ES5Assign, FuncAssign, ES6VarAssign} from '../lib';


describe('PT', () => {
  it('babel plugin should remove ES6.propTypes', () => {
    expect(ES6.propTypes).to.be.undefined;
  });

  it('babel plugin should remove ES5.propTypes', () => {
    expect(ES5.propTypes).to.be.undefined;
  });

  it('babel plugin should remove ES6Assign.propTypes', () => {
    expect(ES6Assign.propTypes).to.be.undefined;
  });

  it('babel plugin should remove ES5Assign.propTypes', () => {
    expect(ES5Assign.propTypes).to.be.undefined;
  });

  it('babel plugin should remove FuncAssign.propTypes', () => {
    expect(FuncAssign.propTypes).to.be.undefined;
  });

  it('babel plugin should remove ES6VarAssign.propTypes', () => {
    expect(ES6VarAssign.propTypes).to.be.undefined;
  });
});
