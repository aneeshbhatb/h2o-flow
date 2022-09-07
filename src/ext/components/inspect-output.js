/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { defer } = require('lodash');

const { stringify } = require('../../core/modules/prelude');

module.exports = function(_, _go, _frame) {
  
  const view = () => _.insertAndExecuteCell('cs', `grid inspect ${stringify(_frame.label)}, ${_frame.metadata.origin}`);

  const plot = () => _.insertAndExecuteCell('cs', _frame.metadata.plot);

  defer(_go);

  return {
    label: _frame.label,
    vectors: _frame.vectors,
    view,
    canPlot: _frame.metadata.plot ? true : false,
    plot,
    template: 'flow-inspect-output'
  };
};

