/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { defer } = require('lodash');

const { stringify } = require('../../core/modules/prelude');
const { react, lift, link, signal, signals } = require("../../core/modules/dataflow");

module.exports = function(_, _go) {

  const _specifiedProject = signal('');
  const _specifiedDataset = signal('');
  const _specifiedTable = signal('');
  const _specifiedColumns = signal('');
  const _exception = signal('');
  const _hasErrorMessage = lift(_exception, function(exception) { if (exception) { return true; } else { return false; } });

  const importSqlTableAction = function() {
    const opt = {
       connection_url: `jdbc:bigquery://https://www.googleapis.com/bigquery/v2;OAuthType=3;ProjectId=${ _specifiedProject() };`,
       table: `\`${ _specifiedDataset() }\`.${ _specifiedTable() }`,
       columns: _specifiedColumns(),
       username: '',
       password: ''
     };
    return _.insertAndExecuteCell('cs', `importSqlTable ${ stringify(opt) }`);
  };

  defer(_go);

  return {
    hasErrorMessage: _hasErrorMessage, //XXX obsolete
    specifiedProject: _specifiedProject,
    specifiedDataset: _specifiedDataset,
    specifiedTable: _specifiedTable,
    specifiedColumns: _specifiedColumns,
    exception: _exception,
    importSqlTableAction,
    template: 'flow-import-bq-table-input'
  };
};
