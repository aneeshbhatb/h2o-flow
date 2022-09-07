/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { defer, map } = require('lodash');

const { stringify } = require('../../core/modules/prelude');

module.exports = function(_, _go, _tables) {
  const createTableView = function(table) {
    const inspect = () => _.insertAndExecuteCell('cs', `inspect ${stringify(table.label)}, ${table.metadata.origin}`);

    const grid = () => _.insertAndExecuteCell('cs', `grid inspect ${stringify(table.label)}, ${table.metadata.origin}`);

    const plot = () => _.insertAndExecuteCell('cs', table.metadata.plot);

    return {
      label: table.label,
      description: table.metadata.description,
      //variables: table.variables #XXX unused?
      inspect,
      grid,
      canPlot: table.metadata.plot ? true : false,
      plot
    };
  };

  defer(_go);

  return {
    hasTables: _tables.length > 0,
    tables: map(_tables, createTableView),
    template: 'flow-inspects-output'
  };
};

