/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { defer } = require('lodash');

module.exports = function(_, _go, _keys) {

  defer(_go);

  return {
    hasKeys: _keys.length > 0,
    keys: _keys,
    template: 'flow-delete-objects-output' 
  };
};
