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

module.exports = function(_, _go, _grid) {
  const _modelViews = signal([]);
  const _hasModels = _grid.model_ids.length > 0;
  const _errorViews = signal([]);
  const _hasErrors = _grid.failure_details.length > 0;
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

  const createModelView = function(model_id) {
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

    const predict = () => _.insertAndExecuteCell('cs', `predict model: ${stringify(model_id.name)}`);

    const cloneModel = function() {
      return alert('Not implemented');
      return _.insertAndExecuteCell('cs', `cloneModel ${stringify(model_id.name)}`);
    };

    const view = () => _.insertAndExecuteCell('cs', `getModel ${stringify(model_id.name)}`);

    const inspect = () => _.insertAndExecuteCell('cs', `inspect getModel ${stringify(model_id.name)}`);

    return {
      key: model_id.name,
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

  const inspect = function() {
    const summary = _.inspect('summary', _grid);
    return _.insertAndExecuteCell('cs', `grid inspect 'summary', ${summary.metadata.origin}`);
  };

  const inspectHistory = function() {
    const history = _.inspect('scoring_history', _grid);
    return _.insertAndExecuteCell('cs', `grid inspect 'scoring_history', ${history.metadata.origin}`);
  };

  const inspectAll = function() {
    const allKeys = (Array.from(_modelViews()).map((view) => view.key));
    //TODO use table origin
    return _.insertAndExecuteCell('cs', `inspect getModels ${stringify(allKeys)}`);
  };

  const initialize = function(grid) {
    _modelViews(map(grid.model_ids, createModelView));
    const errorViews = __range__(0, grid.failure_details.length, false).map((i) => ({
      title: `Error ${i + 1}`,
      detail: grid.failure_details[i],
      params: `Parameters: [ ${ grid.failed_raw_params[i].join(', ') } ]`,
      stacktrace: grid.failure_stack_traces[i]
    }));
    _errorViews(errorViews);
    return defer(_go);
  };

  initialize(_grid);

  return {
    modelViews: _modelViews,
    hasModels: _hasModels,
    errorViews: _errorViews,
    hasErrors: _hasErrors,
    buildModel,
    compareModels,
    predictUsingModels,
    deleteModels,
    checkedModelCount: _checkedModelCount,
    canCompareModels: _canCompareModels,
    hasSelectedModels: _hasSelectedModels,
    checkAllModels: _checkAllModels,
    inspect,
    inspectHistory,
    inspectAll,
    template: 'flow-grid-output'
  };
};



function __range__(left, right, inclusive) {
  let range = [];
  let ascending = left < right;
  let end = !inclusive ? right : ascending ? right + 1 : right - 1;
  for (let i = left; ascending ? i < end : i > end; ascending ? i++ : i--) {
    range.push(i);
  }
  return range;
}