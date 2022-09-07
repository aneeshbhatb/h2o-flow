/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { defer } = require('lodash');

const { stringify } = require('../../core/modules/prelude');
const { lift, link, signal, signals } = require("../../core/modules/dataflow");
const util = require('../modules/util');

module.exports = function(_, _go) {
  const _specifiedUrl = signal('');
  const _specifiedTable = signal('');
  const _specifiedColumns = signal('');
  const _specifiedUsername = signal('');
  const _specifiedPassword = signal('');
  const _specifiedFetchMode = signal('DISTRIBUTED');
  const _exception = signal('');
  const _hasErrorMessage = lift(_exception, function(exception) { if (exception) { return true; } else { return false; } });

  const importSqlTableAction = function() {
    const encryptedPassword = util.encryptPassword(_specifiedPassword());
    const opt = {
       connection_url: _specifiedUrl(),
       table: _specifiedTable(),
       columns: _specifiedColumns(),
       username: _specifiedUsername(),
       password: encryptedPassword,
       fetch_mode: _specifiedFetchMode()
     };
    return _.insertAndExecuteCell('cs', `importSqlTable ${ stringify(opt) }`);
  };

  defer(_go);

  return {
    hasErrorMessage: _hasErrorMessage, //XXX obsolete
    specifiedUrl: _specifiedUrl,
    specifiedTable: _specifiedTable,
    specifiedColumns: _specifiedColumns,
    specifiedUsername: _specifiedUsername,
    specifiedPassword: _specifiedPassword,
    specifiedFetchMode: _specifiedFetchMode,
    exception: _exception,
    importSqlTableAction,
    template: 'flow-import-sql-table-input'
  };
};
