/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { defer, groupBy, map, filter, flatten, throttle, forEach, find } = require('lodash');

const { stringify, deepClone, isTruthy } = require('../../core/modules/prelude');
const { act, react, lift, link, signal } = require("../../core/modules/dataflow");

const util = require('../../core/modules/util');
const failure = require('../../core/components/failure');
const FlowError = require('../../core/modules/flow-error');
const { ControlGroups, columnLabelsFromFrame } = require('./controls');

const ModelBuilderForm = function(_, _algorithm, _parameters) {
  const _exception = signal(null);
  const _validationFailureMessage = signal('');
  const _hasValidationFailures = lift(_validationFailureMessage, isTruthy);

  const _gridStrategies = [ 'Cartesian', 'RandomDiscrete' ];
  const _isGrided = signal(false);
  const _gridId = signal(`grid-${util.uuid()}`);
  const _gridStrategy = signal('Cartesian');
  const _isGridRandomDiscrete = lift(_gridStrategy, strategy => strategy !== _gridStrategies[0]);
  const _gridMaxModels = signal(1000);
  const _gridMaxRuntime = signal(28800);
  const _gridStoppingRounds = signal(0);
  const _gridStoppingMetrics = [ 'AUTO', 'deviance', 'logloss', 'MSE', 'AUC', 'lift_top_group', 'r2', 'misclassification' ];
  const _gridStoppingMetric = signal(_gridStoppingMetrics[0]);
  const _gridStoppingTolerance = signal(0.001);

  const _controlGroups = ControlGroups(_, _parameters);

  // Show/hide grid settings if any controls are grid-ified.

  let controls = flatten(_controlGroups.list);
  forEach(controls, control => react(control.isGrided, () => _isGrided(controls.some(c => c.isGrided()))));

  const _form = _controlGroups.createForm();

  const parameterTemplateOf = control => `flow-${control.kind}-model-parameter`;

  const findFormField = name => find(_form, field => field.name === name);

  (function() {
    const [ trainingFrameParameter,
      validationFrameParameter,
      responseColumnParameter,
      ignoredColumnsParameter,
      offsetColumnsParameter,
      weightsColumnParameter,
      foldColumnParameter,
      interactionsParameter,
      metalearnerFoldColumnParameter,
      interactionPairsParameter,
      monotoneConstraintsParameter,
      startColumnParameter,
      stopColumnParameter
    ] = Array.from(map([
      'training_frame',
      'validation_frame',
      'response_column',
      'ignored_columns',
      'offset_column',
      'weights_column',
      'fold_column',
      'interactions',
      'metalearner_fold_column',
      'interaction_pairs',
      'monotone_constraints',
      'start_column',
      'stop_column'
    ], findFormField));

    if (trainingFrameParameter) {
      if (responseColumnParameter || ignoredColumnsParameter) {
        return act(trainingFrameParameter.value, function(frameKey) {
          if (frameKey) {
            _.requestFrameSummaryWithoutData(frameKey, function(error, frame) {
              if (!error) {
                const columnValues = map(frame.columns, column => column.label);

                if (responseColumnParameter) {
                  responseColumnParameter.values(columnValues);
                }

                if (ignoredColumnsParameter) {
                  ignoredColumnsParameter.values(columnLabelsFromFrame(frame));
                }

                if (weightsColumnParameter) {
                  weightsColumnParameter.values(columnValues);
                }

                if (foldColumnParameter) {
                  foldColumnParameter.values(columnValues);
                }

                if (offsetColumnsParameter) {
                  offsetColumnsParameter.values(columnValues);
                }

                if (responseColumnParameter && ignoredColumnsParameter) {
                  // Mark response column as 'unavailable' in ignored column list.
                  lift(responseColumnParameter.value, function(responseVariableName) {});
                }
                    // FIXME
                    // ignoredColumnsParameter.unavailableValues [ responseVariableName ]

                if (interactionsParameter) {
                  interactionsParameter.values(columnLabelsFromFrame(frame));
                }

                if (metalearnerFoldColumnParameter) {
                  metalearnerFoldColumnParameter.values(columnValues);
                }

                if (interactionPairsParameter) {
                  interactionPairsParameter.columns(columnValues);
                }

                if (monotoneConstraintsParameter) {
                  monotoneConstraintsParameter.columns(columnValues);
                }

                if (startColumnParameter) {
                  startColumnParameter.values(columnValues);
                }

                if (stopColumnParameter) {
                  return stopColumnParameter.values(columnValues);
                }
              }
            });
          }

        });
      }
    }
  })();

  const collectParameters = function(includeUnchangedParameters) {
    if (includeUnchangedParameters == null) { includeUnchangedParameters = false; }
    controls = flatten(_controlGroups.list);
    const isGrided = controls.some(c => c.isGrided());

    const parameters = {};
    const hyperParameters = {};
    for (let control of Array.from(controls)) {
      const value = _controlGroups.readControlValue(control);
      if (control.isGrided()) {
        hyperParameters[control.name] = value;
      } else if ((value != null) && control.isVisible() && (includeUnchangedParameters || control.isRequired || (control.defaultValue !== value))) {
        parameters[control.name] = value;
      }
    }

    if (isGrided) {
      let gridStoppingRounds, maxModels, maxRuntime, stoppingTolerance;
      parameters.grid_id = _gridId();
      parameters.hyper_parameters = hyperParameters;

      // { 'strategy': "RandomDiscrete/Cartesian", 'max_models': 3, 'max_runtime_secs': 20 }

      const searchCriteria =
        {strategy: _gridStrategy()};
      switch (searchCriteria.strategy) {
        case 'RandomDiscrete':
          if (!isNaN(maxModels = parseInt(_gridMaxModels(), 10))) {
            searchCriteria.max_models = maxModels;
          }
          if (!isNaN(maxRuntime = parseInt(_gridMaxRuntime(), 10))) {
            searchCriteria.max_runtime_secs = maxRuntime;
          }
          if (!isNaN(gridStoppingRounds = parseInt(_gridStoppingRounds(), 10))) {
            searchCriteria.stopping_rounds = gridStoppingRounds;
          }
          if (!isNaN(stoppingTolerance = parseFloat(_gridStoppingTolerance()))) {
            searchCriteria.stopping_tolerance = stoppingTolerance;
          }
          searchCriteria.stopping_metric = _gridStoppingMetric();
          break;
      }
      parameters.search_criteria = searchCriteria;
    }

    return parameters;
  };

  //
  // The 'checkForErrors' parameter exists so that we can conditionally choose
  // to ignore validation errors. This is because we need the show/hide states
  // for each field the first time around, but not the errors/warnings/info
  // messages.
  //
  // Thus, when this function is called during form init, checkForErrors is
  //  passed in as 'false', and during form submission, checkForErrors is
  //  passsed in as 'true'.
  //
  const performValidations = function(checkForErrors, go) {
    _exception(null);
    const parameters = collectParameters(true);

    if (parameters.hyper_parameters) {
      return go(); // parameter validation fails with hyper_parameters, so skip.
    }

    _validationFailureMessage('');

    return _.requestModelInputValidation(_algorithm, parameters, function(error, modelBuilder) {
      if (error) {
        return _exception(failure(_, new FlowError('Error fetching initial model builder state', error)));
      } else {
        let hasErrors = false;

        if (modelBuilder.messages.length) {
          const validationsByControlName = groupBy(modelBuilder.messages, validation => validation.field_name);

          for (let control of Array.from(flatten(_controlGroups.list))) {
            const validations = validationsByControlName[control.name];
            _controlGroups.validateControl(control, validations, checkForErrors);
            hasErrors = hasErrors || control.hasError();
          }
        }

        if (hasErrors) {
          return _validationFailureMessage('Your model parameters have one or more errors. Please fix them and try again.');
          // Do not pass go(). Do not collect $200.
        } else {
          _validationFailureMessage('');
          return go();
        }
      }
    }); // Proceed with form submission
  };

  const createModel = function() {
    _exception(null);
    return performValidations(true, function() {
      const parameters = collectParameters(false);
      return _.insertAndExecuteCell('cs', `buildModel '${_algorithm}', ${stringify(parameters)}`);
    });
  };

  const _revalidate = function(value) {
    if (value !== undefined) { // HACK: KO seems to be raising change notifications when dropdown boxes are initialized.
      return performValidations(false, function() {});
    }
  };

  const revalidate = throttle(_revalidate, 100, {leading: false});

  // Kick off validations (minus error checking) to get hidden parameters
  performValidations(false, function() {
    for (let control of Array.from(flatten(_controlGroups.list))) {
      react(control.value, revalidate);
    }
  });

  return {
    form: _form,
    isGrided: _isGrided,
    gridId: _gridId,
    gridStrategy: _gridStrategy,
    gridStrategies: _gridStrategies,
    isGridRandomDiscrete: _isGridRandomDiscrete,
    gridMaxModels: _gridMaxModels,
    gridMaxRuntime: _gridMaxRuntime,
    gridStoppingRounds: _gridStoppingRounds,
    gridStoppingMetrics: _gridStoppingMetrics,
    gridStoppingMetric: _gridStoppingMetric,
    gridStoppingTolerance: _gridStoppingTolerance,
    exception: _exception,
    parameterTemplateOf,
    createModel,
    hasValidationFailures: _hasValidationFailures,
    validationFailureMessage: _validationFailureMessage
  };
};

exports.ModelInput = function(_, _go, _algo, _opts) {
  const _exception = signal(null);
  const _algorithms = signal([]);
  const _algorithm = signal(null);
  const _canCreateModel = lift(_algorithm, function(algorithm) { if (algorithm) { return true; } else { return false; } });

  const _modelForm = signal(null);

  const populateFramesAndColumns = function(frameKey, algorithm, parameters, go) {

    const destinationKeyParameter = find(parameters, parameter => parameter.name === 'model_id');

    if (destinationKeyParameter && !destinationKeyParameter.value) {
      destinationKeyParameter.value = `${algorithm}-${util.uuid()}`;
    }

    //
    // Force classification.
    //
    const classificationParameter = find(parameters, parameter => parameter.name === 'do_classification');

    if (classificationParameter) {
      classificationParameter.value = true;
    }

    return _.requestFrames(function(error, frames) {
      if (error) {
        //TODO handle properly
      } else {
        const frameKeys = (Array.from(frames).map((frame) => frame.frame_id.name));
        const frameParameters = filter(parameters, parameter => parameter.type === 'Key<Frame>');
        for (let parameter of Array.from(frameParameters)) {
          parameter.values = frameKeys;

          //TODO HACK
          if (parameter.name === 'training_frame') {
            if (frameKey) {
              parameter.value = frameKey;
            } else {
              frameKey = parameter.value;
            }
          }
        }

        return go();
      }
    });
  };

  ((() => _.requestModelBuilders(function(error, modelBuilders) {
    _algorithms(modelBuilders);
    _algorithm(_algo ? (find(modelBuilders, builder => builder.algo === _algo)) : undefined);
    const frameKey = _opts != null ? _opts.training_frame : undefined;
    return act(_algorithm, function(builder) {
      if (builder) {
        const algorithm = builder.algo;
        const parameters = deepClone(builder.parameters);
        for (let param of Array.from(parameters)) {
          param.value = param.actual_value;
        }
        return populateFramesAndColumns(frameKey, algorithm, parameters, () => _modelForm(ModelBuilderForm(_, algorithm, parameters)));
      } else {
        return _modelForm(null);
      }
    });
  })))();

  const createModel = () => _modelForm().createModel();

  defer(_go);

  return {
    parentException: _exception, //XXX hacky
    algorithms: _algorithms,
    algorithm: _algorithm,
    modelForm: _modelForm,
    canCreateModel: _canCreateModel,
    createModel,
    template: 'flow-model-input'
  };
};

