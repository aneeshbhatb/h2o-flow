/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * DS202: Simplify dynamic range loops
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { defer, map, head, delay, find, escape } = require('lodash');

const { stringify } = require('../../core/modules/prelude');
const { act, react, lift, link, signal, signals } = require("../../core/modules/dataflow");
const util = require('../../core/modules/util');
const lightning = require('../../core/modules/lightning');

const getParameterValue = function(type, default_value, actual_value) {
  switch (type) {
    case 'Key<Frame>': case 'Key<Model>':
      if (actual_value) { return actual_value.name; } else { return null; }
    case 'Key<Frame>[]': case 'Key<Model>[]':
      if (actual_value) {
        const key_ids = actual_value.map(key => key.name);
        return key_ids.join(', ');
      } else {
        return null;
      }
    case 'VecSpecifier':
      if (actual_value) { return actual_value.column_name; } else { return null; }
    case 'StringPair[]':
      if (actual_value) {
        const pairs = actual_value.map(pair => pair.a + ':' + pair.b);
        return pairs.join(', ');
      } else {
        return null;
      }
    case 'string[]': case 'byte[]': case 'short[]': case 'int[]': case 'long[]': case 'float[]': case 'double[]':
      if (actual_value) { return actual_value.join(', '); } else { return null; }
    case 'KeyValue[]':
      if (actual_value) {
        const keyValues = actual_value.map(kv => kv.key + ' =  ' + kv.value);
        return keyValues.join(', ');
      } else {
        return null;
      }
    default:
      return actual_value;
  }
};

const getAucAsLabel = function(_, model, tableName) {
  let metrics;
  if ((metrics = _.inspect(tableName, model))) {
    return ` , AUC = ${metrics.schema.AUC.at(0)}`;
  } else {
    return '';
  }
};

const getThresholdsAndCriteria = function(_, model, tableName) {
  let criterionTable;
  let i;
  if (criterionTable = _.inspect(tableName, model)) {
    // Threshold dropdown items
    const thresholdVector = criterionTable.schema.threshold;
    const thresholds = (() => {
      let asc, end;
      const result = [];
      for (i = 0, end = thresholdVector.count(), asc = 0 <= end; asc ? i < end : i > end; asc ? i++ : i--) {
        result.push({
          index: i,
          value: thresholdVector.at(i)
        });
      }
      return result;
    })();

    // Threshold criterion dropdown item
    const metricVector = criterionTable.schema.metric;
    const idxVector = criterionTable.schema.idx;
    const criteria = (() => {
      let asc1, end1;
      const result1 = [];
      for (i = 0, end1 = metricVector.count(), asc1 = 0 <= end1; asc1 ? i < end1 : i > end1; asc1 ? i++ : i--) {
        result1.push({
          index: idxVector.at(i),
          value: metricVector.valueAt(i)
        });
      }
      return result1;
    })();

    return { thresholds, criteria };
  } else {
    return undefined;
  }
};

module.exports = function(_, _go, _model, refresh) {
  const _output = signal(null);

  const createOutput = function(_model) {
    let table;
    let confusionMatrix, output, plotter;
    const _isExpanded = signal(false);
    const _plots = signals([]);
    const _pojoPreview = signal(null);
    const _isPojoLoaded = lift(_pojoPreview, function(preview) { if (preview) { return true; } else { return false; } });

    const _inputParameters = map(_model.parameters, function(parameter) {
      const { type, default_value, actual_value, label, help } = parameter;

      return {
        label,
        value: getParameterValue(type, default_value, actual_value),
        help,
        isModified: default_value === actual_value
      };
    });



    // TODO Mega-hack alert. Last arg thresholdsAndCriteria applicable only to ROC charts for binomial models.
    const renderPlot = function(title, isCollapsed, render, thresholdsAndCriteria) {
      let rocPanel;
      const container = signal(null);
      const linkedFrame = signal(null);

      if (thresholdsAndCriteria) { // TODO HACK
        rocPanel = {
          thresholds: signals(thresholdsAndCriteria.thresholds),
          threshold: signal(null),
          criteria: signals(thresholdsAndCriteria.criteria),
          criterion: signal(null)
        };
      }

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
          container(vis.element);

          let _autoHighlight = true;
          if (vis.subscribe) {
            vis.subscribe('markselect', function({frame, indices}) {
              const subframe = lightning.createDataFrame(frame.label, frame.vectors, indices);

              const renderTable = g => g(
                indices.length > 1 ? g.select() : g.select(head(indices)),
                g.from(subframe)
              );
              (_.plot(renderTable))(function(error, table) {
                if (!error) {
                  return linkedFrame(table.element);
                }
              });

              if (rocPanel) { // TODO HACK
                if (indices.length === 1) {
                  const selectedIndex = head(indices);

                  _autoHighlight = false;
                  rocPanel.threshold(find(rocPanel.thresholds(), threshold => threshold.index === selectedIndex));

                  const currentCriterion = rocPanel.criterion();
                  // More than one criterion can point to the same threshold, so ensure that
                  //  we're preserving the existing criterion, if any.
                  if ((!currentCriterion) || (currentCriterion && (currentCriterion.index !== selectedIndex))) {
                    rocPanel.criterion(find(rocPanel.criteria(), criterion => criterion.index === selectedIndex));
                  }

                  _autoHighlight = true;
                } else {
                  rocPanel.criterion(null);
                  rocPanel.threshold(null);
                }
              }
            });

            vis.subscribe('markdeselect', function() {
              linkedFrame(null);

              if (rocPanel) { // TODO HACK
                rocPanel.criterion(null);
                return rocPanel.threshold(null);
              }
            });

            if (rocPanel) { // TODO HACK
              react(rocPanel.threshold, function(threshold) {
                if (threshold && _autoHighlight) {
                  return vis.highlight([ threshold.index ]);
                }
            });

              return react(rocPanel.criterion, function(criterion) {
                if (criterion && _autoHighlight) {
                  return vis.highlight([ criterion.index ]);
                }
            });
            }
          }
        }});

      return _plots.push({
        title,
        plot: container,
        frame: linkedFrame,
        controls: signal(rocPanel),
        isCollapsed
      });
    };

    switch (_model.algo) {
      case 'kmeans':
        if (table = _.inspect('output - Scoring History', _model)) {
          renderPlot('Scoring History', false, _.plot(g => g(
            g.path(
              g.position('iterations', 'within_cluster_sum_of_squares'),
              g.strokeColor(g.value('#1f77b4'))
            ),
            g.point(
              g.position('iterations', 'within_cluster_sum_of_squares'),
              g.strokeColor(g.value('#1f77b4'))
            ),
            g.from(table)
          ))
          );
        }
        break;

      case 'glm':
        if (table = _.inspect('output - Scoring History', _model)) {
          const lambdaSearchParameter = find(_model.parameters, parameter => parameter.name === 'lambda_search');
          const hglmParameter = find(_model.parameters, parameter => parameter.name === "HGLM");

          if ((lambdaSearchParameter != null ? lambdaSearchParameter.actual_value : undefined)) {
            renderPlot('Scoring History', false, _.plot(g => g(
              g.path(
                g.position('iteration', 'deviance_train'),
                g.strokeColor(g.value('#1f77b4'))
              ),
              g.path(
                g.position('iteration', 'deviance_test'),
                g.strokeColor(g.value('#ff7f0e'))
              ),
              g.point(
                g.position('iteration', 'deviance_train'),
                g.strokeColor(g.value('#1f77b4'))
              ),
              g.point(
                g.position('iteration', 'deviance_test'),
                g.strokeColor(g.value('#ff7f0e'))
              ),
              g.from(table),
              g.where('alpha', row => row === _model.output.alpha_best)
            ))
            );
          } else if ((hglmParameter != null ? hglmParameter.actual_value : undefined)) {
            renderPlot('Scoring History', false, _.plot(g => g(
              g.path(
                g.position('iterations', 'convergence'),
                g.strokeColor(g.value('#1f77b4'))
              ),
              g.point(
                g.position('iterations', 'convergence'),
                g.strokeColor(g.value('#1f77b4'))
              ),
              g.from(table)
            ))
            );
          } else {
            renderPlot('Scoring History', false, _.plot(g => g(
              g.path(
                g.position('iterations', 'objective'),
                g.strokeColor(g.value('#1f77b4'))
              ),
              g.point(
                g.position('iterations', 'objective'),
                g.strokeColor(g.value('#1f77b4'))
              ),
              g.from(table)
            ))
            );
          }
        }

        if (table = _.inspect('output - training_metrics - Metrics for Thresholds', _model)) {
          plotter = _.plot(g => g(
            g.path(g.position('fpr', 'tpr')),
            g.line(
              g.position((g.value(1)), (g.value(0))),
              g.strokeColor(g.value('red'))
            ),
            g.from(table),
            g.domainX_HACK(0, 1),
            g.domainY_HACK(0, 1)
          ));
          // TODO Mega-hack alert. Last arg thresholdsAndCriteria applicable only to ROC charts for binomial models.
          renderPlot(`ROC Curve - Training Metrics${getAucAsLabel(_, _model, 'output - training_metrics')}`,
            false, plotter, getThresholdsAndCriteria(_, _model, 'output - training_metrics - Maximum Metrics'));
        }

        if (table = _.inspect('output - validation_metrics - Metrics for Thresholds', _model)) {
          plotter = _.plot(g => g(
            g.path(g.position('fpr', 'tpr')),
            g.line(
              g.position((g.value(1)), (g.value(0))),
              g.strokeColor(g.value('red'))
            ),
            g.from(table),
            g.domainX_HACK(0, 1),
            g.domainY_HACK(0, 1)
          ));
          // TODO Mega-hack alert. Last arg thresholdsAndCriteria applicable only to ROC charts for binomial models.
          renderPlot(`ROC Curve - Validation Metrics${getAucAsLabel(_, _model, 'output - validation_metrics')}`,
            false, plotter, getThresholdsAndCriteria(_, _model, 'output - validation_metrics - Maximum Metrics'));
        }

        if (table = _.inspect('output - cross_validation_metrics - Metrics for Thresholds', _model)) {
          plotter = _.plot(g => g(
            g.path(g.position('fpr', 'tpr')),
            g.line(
              g.position((g.value(1)), (g.value(0))),
              g.strokeColor(g.value('red'))
            ),
            g.from(table),
            g.domainX_HACK(0, 1),
            g.domainY_HACK(0, 1)
          ));
          // TODO Mega-hack alert. Last arg thresholdsAndCriteria applicable only to ROC charts for binomial models.
          renderPlot(`ROC Curve - Cross Validation Metrics${getAucAsLabel(_, _model, 'output - cross_validation_metrics')}`,
            false, plotter, getThresholdsAndCriteria(_, _model, 'output - cross_validation_metrics - Maximum Metrics'));
        }

        if (table = _.inspect('output - Standardized Coefficient Magnitudes', _model)) {
          renderPlot('Standardized Coefficient Magnitudes', false, _.plot(g => g(
            g.rect(
              g.position('coefficients', 'names'),
              g.fillColor('sign')
            ),
            g.from(table),
            g.limit(25)
          ))
          );
        }

        if (output = _model.output) {
          if (output.model_category === 'Multinomial') {
            if (confusionMatrix = __guard__(output.training_metrics != null ? output.training_metrics.cm : undefined, x => x.table)) {
              _plots.push(util.renderMultinomialConfusionMatrix('Training Metrics - Confusion Matrix', confusionMatrix));
            }
            if (confusionMatrix = __guard__(output.validation_metrics != null ? output.validation_metrics.cm : undefined, x1 => x1.table)) {
              _plots.push(util.renderMultinomialConfusionMatrix('Validation Metrics - Confusion Matrix', confusionMatrix));
            }
            if (confusionMatrix = __guard__(output.cross_validation_metrics != null ? output.cross_validation_metrics.cm : undefined, x2 => x2.table)) {
              _plots.push(util.renderMultinomialConfusionMatrix('Cross Validation Metrics - Confusion Matrix', confusionMatrix));
            }
          }
        }
        break;

      case 'deeplearning': case 'deepwater':
        if (table = _.inspect('output - Scoring History', _model)) {
          if (table.schema['validation_logloss'] && table.schema['training_logloss']) {
            renderPlot('Scoring History - logloss', false, _.plot(g => g(
              g.path(
                g.position('epochs', 'training_logloss'),
                g.strokeColor(g.value('#1f77b4'))
              ),
              g.path(
                g.position('epochs', 'validation_logloss'),
                g.strokeColor(g.value('#ff7f0e'))
              ),
              g.point(
                g.position('epochs', 'training_logloss'),
                g.strokeColor(g.value('#1f77b4'))
              ),
              g.point(
                g.position('epochs', 'validation_logloss'),
                g.strokeColor(g.value('#ff7f0e'))
              ),
              g.from(table)
            ))
            );
          } else if (table.schema['training_logloss']) {
            renderPlot('Scoring History - logloss', false, _.plot(g => g(
              g.path(
                g.position('epochs', 'training_logloss'),
                g.strokeColor(g.value('#1f77b4'))
              ),
              g.point(
                g.position('epochs', 'training_logloss'),
                g.strokeColor(g.value('#1f77b4'))
              ),
              g.from(table)
            ))
            );
          }

          if (table.schema['training_deviance']) {
            if (table.schema['validation_deviance']) {
              renderPlot('Scoring History - Deviance', false, _.plot(g => g(
                g.path(
                  g.position('epochs', 'training_deviance'),
                  g.strokeColor(g.value('#1f77b4'))
                ),
                g.path(
                  g.position('epochs', 'validation_deviance'),
                  g.strokeColor(g.value('#ff7f0e'))
                ),
                g.point(
                  g.position('epochs', 'training_deviance'),
                  g.strokeColor(g.value('#1f77b4'))
                ),
                g.point(
                  g.position('epochs', 'validation_deviance'),
                  g.strokeColor(g.value('#ff7f0e'))
                ),
                g.from(table)
              ))
              );
            } else {
              renderPlot('Scoring History - Deviance', false, _.plot(g => g(
                g.path(
                  g.position('epochs', 'training_deviance'),
                  g.strokeColor(g.value('#1f77b4'))
                ),
                g.point(
                  g.position('epochs', 'training_deviance'),
                  g.strokeColor(g.value('#1f77b4'))
                ),
                g.from(table)
              ))
              );
            }
          } else if (table.schema['training_mse']) {
            if (table.schema['validation_mse']) {
              renderPlot('Scoring History - MSE', false, _.plot(g => g(
                g.path(
                  g.position('epochs', 'training_mse'),
                  g.strokeColor(g.value('#1f77b4'))
                ),
                g.path(
                  g.position('epochs', 'validation_mse'),
                  g.strokeColor(g.value('#ff7f0e'))
                ),
                g.point(
                  g.position('epochs', 'training_mse'),
                  g.strokeColor(g.value('#1f77b4'))
                ),
                g.point(
                  g.position('epochs', 'validation_mse'),
                  g.strokeColor(g.value('#ff7f0e'))
                ),
                g.from(table)
              ))
              );
            } else {
              renderPlot('Scoring History - MSE', false, _.plot(g => g(
                g.path(
                  g.position('epochs', 'training_mse'),
                  g.strokeColor(g.value('#1f77b4'))
                ),
                g.point(
                  g.position('epochs', 'training_mse'),
                  g.strokeColor(g.value('#1f77b4'))
                ),
                g.from(table)
              ))
              );
            }
          }
        }

        if (table = _.inspect('output - training_metrics - Metrics for Thresholds', _model)) {
          plotter = _.plot(g => g(
            g.path(g.position('fpr', 'tpr')),
            g.line(
              g.position((g.value(1)), (g.value(0))),
              g.strokeColor(g.value('red'))
            ),
            g.from(table),
            g.domainX_HACK(0, 1),
            g.domainY_HACK(0, 1)
          ));
          // TODO Mega-hack alert. Last arg thresholdsAndCriteria applicable only to ROC charts for binomial models.
          renderPlot(`ROC Curve - Training Metrics${getAucAsLabel(_, _model, 'output - training_metrics')}`, false, plotter,
            getThresholdsAndCriteria(_, _model, 'output - training_metrics - Maximum Metrics'));
        }

        if (table = _.inspect('output - validation_metrics - Metrics for Thresholds', _model)) {
          plotter = _.plot(g => g(
            g.path(g.position('fpr', 'tpr')),
            g.line(
              g.position((g.value(1)), (g.value(0))),
              g.strokeColor(g.value('red'))
            ),
            g.from(table),
            g.domainX_HACK(0, 1),
            g.domainY_HACK(0, 1)
          ));
          // TODO Mega-hack alert. Last arg thresholdsAndCriteria applicable only to ROC charts for binomial models.
          renderPlot(`ROC Curve - Validation Metrics${getAucAsLabel(_, _model, 'output - validation_metrics')}`,
            false, plotter, getThresholdsAndCriteria(_, _model, 'output - validation_metrics - Maximum Metrics'));
        }

        if (table = _.inspect('output - cross_validation_metrics - Metrics for Thresholds', _model)) {
          plotter = _.plot(g => g(
            g.path(g.position('fpr', 'tpr')),
            g.line(
              g.position((g.value(1)), (g.value(0))),
              g.strokeColor(g.value('red'))
            ),
            g.from(table),
            g.domainX_HACK(0, 1),
            g.domainY_HACK(0, 1)
          ));
          // TODO Mega-hack alert. Last arg thresholdsAndCriteria applicable only to ROC charts for binomial models.
          renderPlot(`ROC Curve - Cross Validation Metrics${getAucAsLabel(_, _model, 'output - cross_validation_metrics')}`,
            false, plotter, getThresholdsAndCriteria(_, _model, 'output - cross_validation_metrics - Maximum Metrics'));
        }

        if (table = _.inspect('output - Variable Importances', _model)) {
          renderPlot('Variable Importances', false, _.plot(g => g(
            g.rect(
              g.position('scaled_importance', 'variable')
            ),
            g.from(table),
            g.limit(25)
          ))
          );
        }

        if (output = _model.output) {
          if (output.model_category === 'Multinomial') {
            if (confusionMatrix = __guard__(output.training_metrics != null ? output.training_metrics.cm : undefined, x3 => x3.table)) {
              _plots.push(util.renderMultinomialConfusionMatrix('Training Metrics - Confusion Matrix', confusionMatrix));
            }
            if (confusionMatrix = __guard__(output.validation_metrics != null ? output.validation_metrics.cm : undefined, x4 => x4.table)) {
              _plots.push(util.renderMultinomialConfusionMatrix('Validation Metrics - Confusion Matrix', confusionMatrix));
            }
            if (confusionMatrix = __guard__(output.cross_validation_metrics != null ? output.cross_validation_metrics.cm : undefined, x5 => x5.table)) {
              _plots.push(util.renderMultinomialConfusionMatrix('Cross Validation Metrics - Confusion Matrix', confusionMatrix));
            }
          }
        }
        break;

      case 'gbm': case 'drf': case 'svm': case 'xgboost':
        if (table = _.inspect('output - Scoring History', _model)) {
          if (table.schema['validation_logloss'] && table.schema['training_logloss']) {
            renderPlot('Scoring History - logloss', false, _.plot(g => g(
              g.path(
                g.position('number_of_trees', 'training_logloss'),
                g.strokeColor(g.value('#1f77b4'))
              ),
              g.path(
                g.position('number_of_trees', 'validation_logloss'),
                g.strokeColor(g.value('#ff7f0e'))
              ),
              g.point(
                g.position('number_of_trees', 'training_logloss'),
                g.strokeColor(g.value('#1f77b4'))
              ),
              g.point(
                g.position('number_of_trees', 'validation_logloss'),
                g.strokeColor(g.value('#ff7f0e'))
              ),
              g.from(table)
            ))
            );
          } else if (table.schema['training_logloss']) {
            renderPlot('Scoring History - logloss', false, _.plot(g => g(
              g.path(
                g.position('number_of_trees', 'training_logloss'),
                g.strokeColor(g.value('#1f77b4'))
              ),
              g.point(
                g.position('number_of_trees', 'training_logloss'),
                g.strokeColor(g.value('#1f77b4'))
              ),
              g.from(table)
            ))
            );
          }

          if (table.schema['training_deviance']) {
            if (table.schema['validation_deviance']) {
              renderPlot('Scoring History - Deviance', false, _.plot(g => g(
                g.path(
                  g.position('number_of_trees', 'training_deviance'),
                  g.strokeColor(g.value('#1f77b4'))
                ),
                g.path(
                  g.position('number_of_trees', 'validation_deviance'),
                  g.strokeColor(g.value('#ff7f0e'))
                ),
                g.point(
                  g.position('number_of_trees', 'training_deviance'),
                  g.strokeColor(g.value('#1f77b4'))
                ),
                g.point(
                  g.position('number_of_trees', 'validation_deviance'),
                  g.strokeColor(g.value('#ff7f0e'))
                ),
                g.from(table)
              ))
              );
            } else {
              renderPlot('Scoring History - Deviance', false, _.plot(g => g(
                g.path(
                  g.position('number_of_trees', 'training_deviance'),
                  g.strokeColor(g.value('#1f77b4'))
                ),
                g.point(
                  g.position('number_of_trees', 'training_deviance'),
                  g.strokeColor(g.value('#1f77b4'))
                ),
                g.from(table)
              ))
              );
            }
          }
        }

        if (table = _.inspect('output - training_metrics - Metrics for Thresholds', _model)) {
          plotter = _.plot(g => g(
            g.path(g.position('fpr', 'tpr')),
            g.line(
              g.position((g.value(1)), (g.value(0))),
              g.strokeColor(g.value('red'))
            ),
            g.from(table),
            g.domainX_HACK(0, 1),
            g.domainY_HACK(0, 1)
          ));

          // TODO Mega-hack alert. Last arg thresholdsAndCriteria applicable only to ROC charts for binomial models.
          renderPlot(`ROC Curve - Training Metrics${getAucAsLabel(_, _model, 'output - training_metrics')}`,
            false, plotter, getThresholdsAndCriteria(_, _model, 'output - training_metrics - Maximum Metrics'));
        }

        if (table = _.inspect('output - validation_metrics - Metrics for Thresholds', _model)) {
          plotter = _.plot(g => g(
            g.path(g.position('fpr', 'tpr')),
            g.line(
              g.position((g.value(1)), (g.value(0))),
              g.strokeColor(g.value('red'))
            ),
            g.from(table),
            g.domainX_HACK(0, 1),
            g.domainY_HACK(0, 1)
          ));

          // TODO Mega-hack alert. Last arg thresholdsAndCriteria applicable only to ROC charts for binomial models.
          renderPlot(`ROC Curve - Validation Metrics${getAucAsLabel(_, _model, 'output - validation_metrics')}`,
            false, plotter, getThresholdsAndCriteria(_, _model, 'output - validation_metrics - Maximum Metrics'));
        }

        if (table = _.inspect('output - cross_validation_metrics - Metrics for Thresholds', _model)) {
          plotter = _.plot(g => g(
            g.path(g.position('fpr', 'tpr')),
            g.line(
              g.position((g.value(1)), (g.value(0))),
              g.strokeColor(g.value('red'))
            ),
            g.from(table),
            g.domainX_HACK(0, 1),
            g.domainY_HACK(0, 1)
          ));

          // TODO Mega-hack alert. Last arg thresholdsAndCriteria applicable only to ROC charts for binomial models.
          renderPlot(`ROC Curve - Cross Validation Metrics${getAucAsLabel(_, _model, 'output - cross_validation_metrics')}`,
            false, plotter, getThresholdsAndCriteria(_, _model, 'output - cross_validation_metrics - Maximum Metrics'));
        }

        if (table = _.inspect('output - Variable Importances', _model)) {
          renderPlot('Variable Importances', false, _.plot(g => g(
            g.rect(
              g.position('scaled_importance', 'variable')
            ),
            g.from(table),
            g.limit(25)
          ))
          );
        }

        if (output = _model.output) {
          if (confusionMatrix = __guard__(output.training_metrics != null ? output.training_metrics.cm : undefined, x6 => x6.table)) {
            _plots.push(util.renderMultinomialConfusionMatrix('Training Metrics - Confusion Matrix', confusionMatrix));
          }
          if (confusionMatrix = __guard__(output.validation_metrics != null ? output.validation_metrics.cm : undefined, x7 => x7.table)) {
            _plots.push(util.renderMultinomialConfusionMatrix('Validation Metrics - Confusion Matrix', confusionMatrix));
          }
          if (confusionMatrix = __guard__(output.cross_validation_metrics != null ? output.cross_validation_metrics.cm : undefined, x8 => x8.table)) {
            _plots.push(util.renderMultinomialConfusionMatrix('Cross Validation Metrics - Confusion Matrix', confusionMatrix));
          }
        }
        break;
    // end of when 'gbm', 'drf', 'svm', 'xgboost'

      case 'stackedensemble':
        if (table = _.inspect('output - training_metrics - Metrics for Thresholds', _model)) {
          plotter = _.plot(g => g(
            g.path(g.position('fpr', 'tpr')),
            g.line(
              g.position((g.value(1)), (g.value(0))),
              g.strokeColor(g.value('red'))
            ),
            g.from(table),
            g.domainX_HACK(0, 1),
            g.domainY_HACK(0, 1)
          ));

          // TODO Mega-hack alert. Last arg thresholdsAndCriteria applicable only to ROC charts for binomial models.
          renderPlot(`ROC Curve - Training Metrics${getAucAsLabel(_, _model, 'output - training_metrics')}`,
            false, plotter, getThresholdsAndCriteria(_, _model, 'output - training_metrics - Maximum Metrics'));
        }

        if (table = _.inspect('output - validation_metrics - Metrics for Thresholds', _model)) {
          plotter = _.plot(g => g(
            g.path(g.position('fpr', 'tpr')),
            g.line(
              g.position((g.value(1)), (g.value(0))),
              g.strokeColor(g.value('red'))
            ),
            g.from(table),
            g.domainX_HACK(0, 1),
            g.domainY_HACK(0, 1)
          ));

          // TODO Mega-hack alert. Last arg thresholdsAndCriteria applicable only to ROC charts for binomial models.
          renderPlot(`ROC Curve - Validation Metrics${getAucAsLabel(_, _model, 'output - validation_metrics')}`,
            false, plotter, getThresholdsAndCriteria(_, _model, 'output - validation_metrics - Maximum Metrics'));
        }

        if (table = _.inspect('output - cross_validation_metrics - Metrics for Thresholds', _model)) {
          plotter = _.plot(g => g(
            g.path(g.position('fpr', 'tpr')),
            g.line(
              g.position((g.value(1)), (g.value(0))),
              g.strokeColor(g.value('red'))
            ),
            g.from(table),
            g.domainX_HACK(0, 1),
            g.domainY_HACK(0, 1)
          ));

          // TODO Mega-hack alert. Last arg thresholdsAndCriteria applicable only to ROC charts for binomial models.
          renderPlot(`ROC Curve - Cross Validation Metrics${getAucAsLabel(_, _model, 'output - cross_validation_metrics')}`,
            false, plotter, getThresholdsAndCriteria(_, _model, 'output - cross_validation_metrics - Maximum Metrics'));
        }

        if (table = _.inspect('output - Variable Importances', _model)) {
          renderPlot('Variable Importances', false, _.plot(g => g(
            g.rect(
              g.position('scaled_importance', 'variable')
            ),
            g.from(table),
            g.limit(25)
          ))
          );
        }

        if (output = _model.output) {
          if (output.model_category === 'Multinomial') {
            if (confusionMatrix = __guard__(output.training_metrics != null ? output.training_metrics.cm : undefined, x9 => x9.table)) {
              _plots.push(util.renderMultinomialConfusionMatrix('Training Metrics - Confusion Matrix', confusionMatrix));
            }
            if (confusionMatrix = __guard__(output.validation_metrics != null ? output.validation_metrics.cm : undefined, x10 => x10.table)) {
              _plots.push(util.renderMultinomialConfusionMatrix('Validation Metrics - Confusion Matrix', confusionMatrix));
            }
            if (confusionMatrix = __guard__(output.cross_validation_metrics != null ? output.cross_validation_metrics.cm : undefined, x11 => x11.table)) {
              _plots.push(util.renderMultinomialConfusionMatrix('Cross Validation Metrics - Confusion Matrix', confusionMatrix));
            }
          }
        }
        break;
    }
    // end of stackedensemble

    if (table = _.inspect('output - training_metrics - Gains/Lift Table', _model)) {
      renderPlot('Training Metrics - Gains/Lift Table', false, _.plot(g => g(
        g.path(
          g.position('cumulative_data_fraction', 'cumulative_capture_rate'),
          g.strokeColor(g.value('black'))
        ),
        g.path(
          g.position('cumulative_data_fraction', 'cumulative_lift'),
          g.strokeColor(g.value('green'))
        ),
        g.from(table)
      ))
      );
    }
    if (table = _.inspect('output - validation_metrics - Gains/Lift Table', _model)) {
      renderPlot('Validation Metrics - Gains/Lift Table', false, _.plot(g => g(
        g.path(
          g.position('cumulative_data_fraction', 'cumulative_capture_rate'),
          g.strokeColor(g.value('black'))
        ),
        g.path(
          g.position('cumulative_data_fraction', 'cumulative_lift'),
          g.strokeColor(g.value('green'))
        ),
        g.from(table)
      ))
      );
    }
    if (table = _.inspect('output - cross_validation_metrics - Gains/Lift Table', _model)) {
      renderPlot('Cross Validation Metrics - Gains/Lift Table', false, _.plot(g => g(
        g.path(
          g.position('cumulative_data_fraction', 'cumulative_capture_rate'),
          g.strokeColor(g.value('black'))
        ),
        g.path(
          g.position('cumulative_data_fraction', 'cumulative_lift'),
          g.strokeColor(g.value('green'))
        ),
        g.from(table)
      ))
      );
    }

    for (let tableName of Array.from(_.ls(_model))) {

      if (tableName !== 'parameters') {
        if (0 === tableName.indexOf('output - training_metrics - cm')) {
          continue;
        } else if (0 === tableName.indexOf('output - validation_metrics - cm')) {
          continue;
        } else if (0 === tableName.indexOf('output - cross_validation_metrics - cm')) {
          continue;
        }

        if (table = _.inspect(tableName, _model)) {
          renderPlot(tableName + (table.metadata.description ? ` (${table.metadata.description})` : ''), true, _.plot(g => g(
            table.indices.length > 1 ? g.select() : g.select(0),
            g.from(table)
          ))
          );
        }
      }
    }

    const toggle = () => _isExpanded(!_isExpanded());

    const cloneModel = () => // _.insertAndExecuteCell 'cs', 'assist buildModel,
    alert('Not implemented');

    const predict = () => _.insertAndExecuteCell('cs', `predict model: ${stringify(_model.model_id.name)}`);

    const inspect = () => _.insertAndExecuteCell('cs', `inspect getModel ${stringify(_model.model_id.name)}`);

    const previewPojo = () => _.requestPojoPreview(_model.model_id.name, function(error, result) {
      if (error) {
        return _pojoPreview(`<pre>${escape(error)}</pre>`);
      } else {
        return _pojoPreview(`<pre>${util.highlight(result, 'java')}</pre>`);
      }
    });

    const downloadPojo = () => window.open(_.ContextPath + `3/Models.java/${encodeURIComponent(_model.model_id.name)}`, '_blank');

    const downloadGenJar = () => window.open(_.ContextPath + "3/h2o-genmodel.jar",'_blank');

    const downloadMojo = () => window.open(_.ContextPath + `3/Models/${encodeURIComponent(_model.model_id.name)}/mojo`, '_blank');

    const exportModel = () => _.insertAndExecuteCell('cs', `exportModel ${stringify(_model.model_id.name)}`);

    const deleteModel = () => _.confirm('Are you sure you want to delete this model?', { acceptCaption: 'Delete Model', declineCaption: 'Cancel' }, function(accept) {
      if (accept) {
        return _.insertAndExecuteCell('cs', `deleteModel ${stringify(_model.model_id.name)}`);
      }
    });


    return {
      key: _model.model_id,
      algo: _model.algo_full_name,
      plots: _plots,
      inputParameters: _inputParameters,
      isExpanded: _isExpanded,
      havePojo: _model.have_pojo,
      haveMojo: _model.have_mojo,
      toggle,
      cloneModel,
      predict,
      inspect,
      previewPojo,
      downloadPojo,
      downloadGenJar,
      downloadMojo,
      pojoPreview: _pojoPreview,
      isPojoLoaded: _isPojoLoaded,
      exportModel,
      deleteModel
    };
  };


  const _isLive = signal(false);
  act(_isLive, function(isLive) {
    if (isLive) { return _refresh(); }
  });

  var _refresh = () => refresh(function(error, model) {
    if (!error) {
      _output(createOutput(model));
      if (_isLive()) { return delay(_refresh, 2000); }
    }
  });

  const _toggleRefresh = () => _isLive(!_isLive());

  _output(createOutput(_model));

  defer(_go);

  return {
    output: _output,
    toggleRefresh: _toggleRefresh,
    isLive: _isLive,
    template: 'flow-model-output'
  };
};

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}