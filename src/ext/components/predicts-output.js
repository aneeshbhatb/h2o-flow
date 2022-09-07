/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { defer, map, every } = require('lodash');

const { stringify } = require('../../core/modules/prelude');
const { react, lift, link, signal, signals } = require("../../core/modules/dataflow");

module.exports = function(_, _go, opts, _predictions) {

  const _predictionViews = signal([]);
  const _checkAllPredictions = signal(false);
  const _canComparePredictions = signal(false);
  const _rocCurve = signal(null);

  const arePredictionsComparable = function(views) {
    if (views.length === 0) { return false; }
    return every(views, view => view.modelCategory === 'Binomial');
  };

  let _isCheckingAll = false;
  react(_checkAllPredictions, function(checkAll) {
    _isCheckingAll = true;
    for (let view of Array.from(_predictionViews())) {
      view.isChecked(checkAll);
    }
    _canComparePredictions(checkAll && arePredictionsComparable(_predictionViews()));
    _isCheckingAll = false;
  });

  const createPredictionView = function(prediction) {
    const _modelKey = prediction.model.name;
    const _frameKey = prediction.frame != null ? prediction.frame.name : undefined;
    const _hasFrame = _frameKey ? true : false;
    const _isChecked = signal(false);

    react(_isChecked, function() {
      if (_isCheckingAll) { return; }
      const checkedViews = ((() => {
        const result = [];
        for (let view of Array.from(_predictionViews())) {           if (view.isChecked()) {
            result.push(view);
          }
        }
        return result;
      })());
      return _canComparePredictions(arePredictionsComparable(checkedViews));
    });

    const view = function() {
      if (_hasFrame) {
        return _.insertAndExecuteCell('cs', `getPrediction model: ${stringify(_modelKey)}, frame: ${stringify(_frameKey)}`);
      }
    };

    const inspect = function() {
      if (_hasFrame) {
        return _.insertAndExecuteCell('cs', `inspect getPrediction model: ${stringify(_modelKey)}, frame: ${stringify(_frameKey)}`);
      }
    };

    return {
      modelKey: _modelKey,
      frameKey: _frameKey,
      modelCategory: prediction.model_category,
      isChecked: _isChecked,
      hasFrame: _hasFrame,
      view,
      inspect
    };
  };
  
  const _predictionsTable = _.inspect('predictions', _predictions);
  const _metricsTable = _.inspect('metrics', _predictions);
  const _scoresTable = _.inspect('scores', _predictions);

  const comparePredictions = function() {
    const selectedKeys = ((() => {
      const result = [];
       for (let view of Array.from(_predictionViews())) {         if (view.isChecked()) {
          result.push({ model: view.modelKey, frame: view.frameKey });
        }
      }
      return result;
    })());
    return _.insertAndExecuteCell('cs', `getPredictions ${stringify(selectedKeys)}`);
  };

  const plotPredictions = () => _.insertAndExecuteCell('cs', _predictionsTable.metadata.plot);

  const plotScores = () => _.insertAndExecuteCell('cs', _scoresTable.metadata.plot);

  const plotMetrics = () => _.insertAndExecuteCell('cs', _metricsTable.metadata.plot);

  const inspectAll = () => _.insertAndExecuteCell('cs', `inspect ${_predictionsTable.metadata.origin}`);

  const predict = () => _.insertAndExecuteCell('cs', 'predict');

  const initialize = function(predictions) {
    _predictionViews(map(predictions, createPredictionView));

//    TODO handle non-binomial models
//    rocCurveConfig =
//      data: _.inspect 'scores', _predictions
//      type: 'line'
//      x: 'FPR'
//      y: 'TPR'
//      color: 'key'
//    _.plot rocCurveConfig, (error, el) ->
//      unless error
//        _rocCurve el

    return defer(_go);
  };

  initialize(_predictions);
  
  return {
    predictionViews: _predictionViews,
    hasPredictions: _predictions.length > 0,
    comparePredictions,
    canComparePredictions: _canComparePredictions,
    checkAllPredictions: _checkAllPredictions,
    plotPredictions,
    plotScores,
    plotMetrics,
    inspect: inspectAll,
    predict,
    rocCurve: _rocCurve,
    template: 'flow-predicts-output'
  };
};

