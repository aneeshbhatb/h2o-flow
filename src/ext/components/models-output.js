/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { defer, map } = require('lodash');

const { stringify } = require('../../core/modules/prelude');
const { react, lift, link, signal, signals } = require("../../core/modules/dataflow");

module.exports = function(_, _go, _models) {
  const _modelViews = signal([]);
  const _checkAllModels = signal(false);
  const _checkedModelCount = signal(0);
  const _canCompareModels = lift(_checkedModelCount, count => count > 1);
  const _hasSelectedModels = lift(_checkedModelCount, count => count > 0);

  let _isCheckingAll = false;
  react(_checkAllModels, function(checkAll) {
    _isCheckingAll = true;
    const views = _modelViews();
    for (let view of Array.from(views)) {
      view.isChecked(checkAll);
    }
    _checkedModelCount(checkAll ? views.length : 0);
    _isCheckingAll = false;
  });

  const createModelView = function(model) {
    const _isChecked = signal(false);

    react(_isChecked, function() {
      if (_isCheckingAll) { return; }
      const checkedViews = ((() => {
        const result = [];
        for (let view of Array.from(_modelViews())) {           if (view.isChecked()) {
            result.push(view);
          }
        }
        return result;
      })());
      return _checkedModelCount(checkedViews.length);
    });

    const predict = () => _.insertAndExecuteCell('cs', `predict model: ${stringify(model.model_id.name)}`);

    const cloneModel = function() {
      return alert('Not implemented');
      return _.insertAndExecuteCell('cs', `cloneModel ${stringify(model.model_id.name)}`);
    };

    const view = () => _.insertAndExecuteCell('cs', `getModel ${stringify(model.model_id.name)}`);

    const inspect = () => _.insertAndExecuteCell('cs', `inspect getModel ${stringify(model.model_id.name)}`);

    return {
      key: model.model_id.name,
      algo: model.algo_full_name,
      isChecked: _isChecked,
      predict,
      clone: cloneModel,
      inspect,
      view
    };
  };

  const buildModel = () => _.insertAndExecuteCell('cs', 'buildModel');

  const collectSelectedKeys = () => (() => {
    const result = [];
    for (let view of Array.from(_modelViews())) {
      if (view.isChecked()) {
        result.push(view.key);
      }
    }
    return result;
  })();

  const compareModels = () => _.insertAndExecuteCell('cs', `inspect getModels ${stringify(collectSelectedKeys())}`);

  const predictUsingModels = () => _.insertAndExecuteCell('cs', `predict models: ${stringify(collectSelectedKeys())}`);

  const deleteModels = () => _.confirm('Are you sure you want to delete these models?', { acceptCaption: 'Delete Models', declineCaption: 'Cancel' }, function(accept) {
    if (accept) {
      return _.insertAndExecuteCell('cs', `deleteModels ${stringify(collectSelectedKeys())}`);
    }
  });


  const inspectAll = function() {
    const allKeys = (Array.from(_modelViews()).map((view) => view.key));
    //TODO use table origin
    return _.insertAndExecuteCell('cs', `inspect getModels ${stringify(allKeys)}`);
  };

  const initialize = function(models) {
    _modelViews(map(models, createModelView));
    return defer(_go);
  };

  initialize(_models);

  return {
    modelViews: _modelViews,
    hasModels: _models.length > 0,
    buildModel,
    compareModels,
    predictUsingModels,
    deleteModels,
    checkedModelCount: _checkedModelCount,
    canCompareModels: _canCompareModels,
    hasSelectedModels: _hasSelectedModels,
    checkAllModels: _checkAllModels,
    inspect: inspectAll,
    template: 'flow-models-output'
  };
};

