/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { defer, map } = require('lodash');

const { stringify } = require('../../core/modules/prelude');
const { react, lift, link, signal, signals } = require("../../core/modules/dataflow");

module.exports = function(_, _go, _grids) {
  const _gridViews = signal([]);

  const createGridView = function(grid) {
    const view = () => _.insertAndExecuteCell('cs', `getGrid ${stringify(grid.grid_id.name)}`);

    return {
      key: grid.grid_id.name,
      size: grid.model_ids.length,
      view
    };
  };

  const buildModel = () => _.insertAndExecuteCell('cs', 'buildModel');

  const initialize = function(grids) {
    _gridViews(map(grids, createGridView));
    return defer(_go);
  };

  initialize(_grids);

  return {
    gridViews: _gridViews,
    hasGrids: _grids.length > 0,
    buildModel,
    template: 'flow-grids-output'
  };
};


