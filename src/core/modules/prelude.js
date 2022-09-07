/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS202: Simplify dynamic range loops
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { head, isUndefined, indexOf, isNumber, isObject } = require('lodash');
const BigNumber = require('bignumber.js');

const { TNull, TUndefined, TBoolean, TString, TNumber, TFunction, TObject, TArray, TArguments, TDate, TRegExp, TError } = require('./types');

module.exports = (function() {
  const _isDefined = value => !isUndefined(value);
  const _isTruthy = function(value) { if (value) { return true; } else { return false; } };
  const _isFalsy = function(value) { if (value) { return false; } else { return true; } };
  const _isNumber = value => isNumber(value) || value instanceof BigNumber;
  const _isObject = value => isObject(value) && !(value instanceof BigNumber);
  const _negative = value => !value;
  const _always = () => true;
  const _never = () => false;
  const _copy = array => array.slice(0);
  const _remove = function(array, element) {
    let index;
    if (-1 < (index = indexOf(array, element))) {
      return head(array.splice(index, 1));
    } else {
      return undefined;
    }
  };
  const _words = text => text.split(/\s+/);
  const _repeat = function(count, value) {
    const array = [];
    for (let i = 0, end = count, asc = 0 <= end; asc ? i < end : i > end; asc ? i++ : i--) {
      array.push(value);
    }
    return array;
  };

  const _typeOf = function(a) {
    const type = Object.prototype.toString.call(a);
    if (a === null) {
      return TNull;
    } else if (a === undefined) {
      return TUndefined;
    } else if ((a === true) || (a === false) || (type === '[object Boolean]')) {
      return TBoolean;
    } else {
      switch (type) {
        case '[object String]':
          return TString;
        case '[object Number]':
          return TNumber;
        case '[object Function]':
          return TFunction;
        case '[object Object]':
          return TObject;
        case '[object Array]':
          return TArray;
        case '[object Arguments]':
          return TArguments;
        case '[object Date]':
          return TDate;
        case '[object RegExp]':
          return TRegExp;
        case '[object Error]':
          return TError;
        default:
          return type;
      }
    }
  };

  const _deepClone = obj => JSON.parse(JSON.stringify(obj));
  
  return {
    isDefined: _isDefined,
    isTruthy: _isTruthy,
    isFalsy: _isFalsy,
    isNumber: _isNumber,
    isObject: _isObject,
    negative: _negative,
    always: _always,
    never: _never,
    copy: _copy,
    remove: _remove,
    words: _words,
    repeat: _repeat,
    typeOf: _typeOf,
    deepClone: _deepClone,
    stringify: JSON.stringify
  };
})();

