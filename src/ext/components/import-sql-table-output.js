/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { defer } = require('lodash');

const { stringify } = require('../../core/modules/prelude');

module.exports = function(_, _go, _importResults) {
  const viewData = function() {
    if (_importResults.status === 'DONE') {
      return _.insertAndExecuteCell('cs', `getFrameSummary ${ stringify(_importResults.dest.name) }`);
    } else {
      return _.insertAndExecuteCell('cs', `getJob ${ stringify(_importResults.key.name) }`);
    }
  };

  defer(_go);
  return {
    viewData,
    template: 'flow-import-sql-table-output'
  };
};

