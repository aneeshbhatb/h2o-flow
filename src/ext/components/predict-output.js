/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { defer, map } = require('lodash');

const { stringify } = require('../../core/modules/prelude');
const { react, lift, link, signal, signals } = require("../../core/modules/dataflow");
const util = require('../../core/modules/util');

module.exports = function(_, _go, modelKey, frameKey, predictionFrame, prediction) {
  let frame, model;
  if (prediction) {
    ({ frame, model } = prediction);
  }

  const predictionFrameKey = predictionFrame.name;
  const _plots = signals([]);
  const _canInspect = prediction.__meta ? true : false;

  const renderPlot = function(title, prediction, render) {
    const container = signal(null);

    const combineWithFrame = function() {
      const targetFrameName = `combined-${predictionFrameKey}`;

      return _.insertAndExecuteCell('cs', `bindFrames ${stringify(targetFrameName)}, [ ${stringify(predictionFrameKey)}, ${stringify(frameKey)} ]`);
    };

    render(function(error, vis) {
      if (error) {
        return console.debug(error);
      } else {
        $('a', vis.element).on('click', function(e) {
          const $a = $(e.target);
          switch ($a.attr('data-type')) {
            case 'frame':
              return _.insertAndExecuteCell('cs', `getFrameSummary ${stringify($a.attr('data-key'))}`);
            case 'model':
              return _.insertAndExecuteCell('cs', `getModel ${stringify($a.attr('data-key'))}`);
          }
        });
        return container(vis.element);
      }
    });

    return _plots.push({
      title,
      plot: container,
      combineWithFrame,
      canCombineWithFrame: title === 'Prediction'
    });
  };

  if (prediction) {
    let table;
    switch ((prediction.__meta != null ? prediction.__meta.schema_type : undefined)) {
      case 'ModelMetricsBinomial': case 'ModelMetricsBinomialGLM':
        if (table = _.inspect('Prediction - Metrics for Thresholds', prediction)) {
          renderPlot('ROC Curve', prediction, _.plot(g => g(
            g.path(g.position('fpr', 'tpr')),
            g.line(
              g.position((g.value(1)), (g.value(0))),
              g.strokeColor(g.value('red'))
            ),
            g.from(table),
            g.domainX_HACK(0, 1),
            g.domainY_HACK(0, 1)
          ))
          );
        }
        break;
    }

    for (let tableName of Array.from(_.ls(prediction))) {
      const cmTableName = __guard__(__guard__(prediction != null ? prediction.cm : undefined, x1 => x1.table), x => x.name);
      if (tableName === 'Prediction - cm') { // Skip the empty section
          continue;
      } else if ((cmTableName != null) && (tableName != null) && (tableName.indexOf(cmTableName, tableName.length - cmTableName.length) !== -1)) {
        _plots.push(util.renderMultinomialConfusionMatrix("Prediction - Confusion Matrix", prediction.cm.table));
      } else {
        if (table = _.inspect(tableName, prediction)) {
            if (table.indices.length > 1) {
              renderPlot(tableName, prediction, _.plot(g => g(
                g.select(),
                g.from(table)
              ))
              );
            } else {
              renderPlot(tableName, prediction, _.plot(g => g(
                g.select(0),
                g.from(table)
              ))
              );
            }
          }
      }
    }
  }

  const inspect = () => //XXX get this from prediction table
  _.insertAndExecuteCell(
    'cs',
    `inspect getPrediction model: ${stringify(model.name)}, frame: ${stringify(frame.name)}`
  );

  defer(_go);

  return {
    plots: _plots,
    inspect,
    canInspect: _canInspect,
    template: 'flow-predict-output'
  };
};

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}