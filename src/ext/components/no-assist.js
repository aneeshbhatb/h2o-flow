/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { defer, map } = require('lodash');

module.exports = function(_, _go) {
  defer(_go);
  return {
    showAssist() { return _.insertAndExecuteCell('cs', 'assist'); },
    template: 'flow-no-assist'
  };
};

