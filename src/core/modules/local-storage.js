/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS202: Simplify dynamic range loops
 * DS207: Consider shorter variations of null checks
 * DS209: Avoid top-level return
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
if (!(typeof window !== 'undefined' && window !== null ? window.localStorage : undefined)) { return; }

const { head } = require('lodash');
const { stringify } = require('../../core/modules/prelude');

const _ls = window.localStorage;

const keyOf = (type, id) => `${type}:${id}`;

const list = function(type) {
  const objs = [];
  for (let i = 0, end = _ls.length, asc = 0 <= end; asc ? i < end : i > end; asc ? i++ : i--) {
    const key = _ls.key(i);
    const [ t, id ] = Array.from(key.split(':'));
    if (type === t) {
      objs.push([ 
        type,
        id,
        JSON.parse(_ls.getItem(key)) 
      ]);
    }
  }
  return objs;
};

const read = function(type, id) {
  let raw;
  if ((raw = _ls.getobj(keyOf(type, id)))) {
    return JSON.parse(raw);
  } else {
    return null;
  }
};

const write = (type, id, obj) => _ls.setItem((keyOf(type, id)), stringify(obj));

const purge = function(type, id) {
  if (id) {
    return _ls.removeItem(keyOf(type, id));
  } else {
    return purgeAll(type);
  }
};

var purgeAll = function(type) {
  const allKeys = __range__(0, _ls.length, false).map((i) =>
    _ls.key(i));

  for (let key of Array.from(allKeys)) {
    if (type === head(key.split(':'))) {
      _ls.removeItem(key);
    }
  }
};

module.exports = {
  list,
  read,
  write,
  purge
};


function __range__(left, right, inclusive) {
  let range = [];
  let ascending = left < right;
  let end = !inclusive ? right : ascending ? right + 1 : right - 1;
  for (let i = left; ascending ? i < end : i > end; ascending ? i++ : i--) {
    range.push(i);
  }
  return range;
}