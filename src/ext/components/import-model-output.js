/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { defer } = require('lodash');

const { stringify } = require('../../core/modules/prelude');

module.exports = function(_, _go, result) {
  const viewModel = () => _.insertAndExecuteCell('cs', `getModel ${stringify(result.models[0].model_id.name)}`);
  defer(_go);
  return {
    viewModel,
    template: 'flow-import-model-output'
  };
};


