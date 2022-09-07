/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { defer, map } = require('lodash');

module.exports = function(_, _go, _plot) {

  defer(_go);
  
  return {
    plot: _plot,
    template: 'flow-plot-output'
  };
};
