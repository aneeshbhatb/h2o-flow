/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { defer } = require('lodash');

const { stringify } = require('../../core/modules/prelude');
const { react, lift, link, signal, signals } = require("../../core/modules/dataflow");

module.exports = function(_, _go, modelKey, path, opt) {
  if (opt == null) { opt = {}; }
  const _models = signal([]);
  const _rawModels = signal([]);
  const _selectedModelKey = signal(null);
  const _path = signal(null);
  const _overwrite = signal(opt.overwrite ? true : false);
  const _hasMojo = lift(_selectedModelKey, function(modelKey) {
    for (let model of Array.from(_rawModels())) {
      if ((model.model_id.name === modelKey) && (model.have_mojo === true)) {
          return true;
        }
    }
    return false;
  });

  const _canExportModel = lift(_selectedModelKey, _path, (modelKey, path) => modelKey && path);

  const _canExportModelMojo = lift(_canExportModel, _hasMojo, (exportable, hasMojo) => exportable && hasMojo);

  const _export = format => _.insertAndExecuteCell('cs', `exportModel ${stringify(_selectedModelKey())}, ${stringify(_path())}, overwrite: ${_overwrite() ? 'true' : 'false'}, format: \"${ format }\"`);

  const exportModel = () => _export("bin");

  const exportModelMojo = () => _export("mojo");

  _.requestModels(function(error, models) {
    if (error) {
      //TODO handle properly
    } else {
      _models((Array.from(models).map((model) => model.model_id.name)));
      _rawModels(models);
      return _selectedModelKey(modelKey);
    }
  });

  defer(_go);

  return {
    models: _models,
    selectedModelKey: _selectedModelKey,
    path: _path,
    overwrite: _overwrite,
    canExportModel: _canExportModel,
    canExportModelMojo: _canExportModelMojo,
    exportModel,
    exportModelMojo,
    template: 'flow-export-model-input'
  };
};

