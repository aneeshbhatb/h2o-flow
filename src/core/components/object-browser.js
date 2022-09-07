/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { defer, head } = require('lodash');

const { typeOf } = require('../modules/prelude');
const { react, signal, signals } = require("../modules/dataflow");

const isExpandable = function(type) {
  switch (type) {
    case 'null': case 'undefined': case 'Boolean': case 'String': case 'Number': case 'Date': case 'RegExp': case 'Arguments': case 'Function':
      return false;
    default:
      return true;
  }
};

const previewArray = function(array) {
  const ellipsis = array.length > 5 ? ', ...' : '';
  const previews = Array.from(head(array, 5)).map((element) =>
    preview(element));
  return `[${previews.join(', ')}${ellipsis}]`;
};

const previewObject = function(object) {
  let count = 0;
  const previews = [];
  let ellipsis = '';
  for (let key in object) {
    const value = object[key];
    if (key !== '_flow_') {
      previews.push(`${key}: ${preview(value)}`);
      if (++count === 5) {
        ellipsis = ', ...';
        break; 
      }
    }
  }
  return `{${previews.join(', ')}${ellipsis}}`; 
};

var preview = function(element, recurse) {
  if (recurse == null) { recurse = false; }
  const type = typeOf(element);
  switch (type) {
    case 'Boolean': case 'String': case 'Number': case 'Date': case 'RegExp':
      return element;
    case 'undefined': case 'null': case 'Function': case 'Arguments':
      return type;
    case 'Array':
      if (recurse) { return previewArray(element); } else { return type; }
    default:
      if (recurse) { return previewObject(element); } else { return type; }
  }
};

//TODO slice large arrays
var objectBrowserElement = function(key, object) {
  const _expansions = signal(null);
  const _isExpanded = signal(false);
  const _type = typeOf(object);
  const _canExpand = isExpandable(_type);
  const toggle = function() {
    if (!_canExpand) { return; }
    if (_expansions() === null) {
      const expansions = [];
      for (key in object) {
        const value = object[key];
        if (key !== '_flow_') {
          expansions.push(objectBrowserElement(key, value));
        }
      }
      _expansions(expansions);
    }
    return _isExpanded(!_isExpanded());
  };

  return {
    key,
    preview: preview(object, true),
    toggle,
    expansions: _expansions,
    isExpanded: _isExpanded,
    canExpand: _canExpand
  };
};

module.exports = function(_, _go, key, object) {

  defer(_go);

  return {
    object: objectBrowserElement(key, object),
    template: 'flow-object'
  };
};
