/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { defer } = require('lodash');

const { stringify } = require('../../core/modules/prelude');

module.exports = function(_, _go, key, result) {
  const viewFrame = () => _.insertAndExecuteCell('cs', `getFrameSummary ${stringify(key)}`);

  defer(_go);

  return {
    viewFrame,
    template: 'flow-bind-frames-output'
  };
};
