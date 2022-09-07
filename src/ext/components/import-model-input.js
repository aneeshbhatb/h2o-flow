/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { defer } = require('lodash');

const { stringify } = require('../../core/modules/prelude');
const { react, lift, link, signal, signals } = require("../../core/modules/dataflow");

module.exports = function(_, _go, path, opt) {
  if (opt == null) { opt = {}; }
  const _path = signal(path); 
  const _overwrite = signal(opt.overwrite ? true : false);
  const _canImportModel = lift(_path, path => path && path.length);

  const importModel = () => _.insertAndExecuteCell('cs', `importModel ${stringify(_path())}, overwrite: ${_overwrite() ? 'true' : 'false'}`);

  defer(_go);

  return {
    path: _path,
    overwrite: _overwrite,
    canImportModel: _canImportModel,
    importModel,
    template: 'flow-import-model-input'
  };
};

