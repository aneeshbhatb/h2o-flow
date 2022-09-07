/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS201: Simplify complex destructure assignments
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { assign, defer, every, find, flatten, head, identity, isPlainObject, map, some} = require('lodash');

const { act, lift, merge, react, signal, signals, unlink } = require("../../core/modules/dataflow");
const { stringify, isTruthy } = require('../../core/modules/prelude');
const { ControlGroups, columnLabelsFromFrame } = require('./controls');

const AutoMLForm = function(_, _parameters, _opts) {
  let p;
  if (_opts == null) { _opts = {}; }
  const _exception = signal(null);
  const _validationFailureMessage = signal('');
  const _hasValidationFailures = lift(_validationFailureMessage, isTruthy);

  const requiredParameters = [
    'training_frame',
    'response_column'
  ];
  const ignoredParameters = [
    'include_algos',
    'algo_parameters',
    'modeling_plan',
    'preprocessing',
  ];
  // for the most part, defaults are taken from the REST API (default value of the property on the schema instance)
  // but we can set different defaults for Flow here
  const localDefaults = {
    keep_cross_validation_predictions: true,
    keep_cross_validation_models: true
  };

  const defaults = assign({}, localDefaults, _opts);

  const validParameters = ((() => {
    const result = [];
    for (p of Array.from(_parameters)) {       if (!Array.from(ignoredParameters).includes(p.name)) {
        result.push(p);
      }
    }
    return result;
  })());
  for (p of Array.from(validParameters)) {
    if (Array.from(requiredParameters).includes(p.name)) {
      p.required = true;
    }
    if (defaults[p.name] != null) {
      p.value = defaults[p.name];
    }
  }

  const columnParameterNames = ((() => {
    const result1 = [];
    for (p of Array.from(validParameters)) {       if (p.type === 'VecSpecifier') {
        result1.push(p.name);
      }
    }
    return result1;
  })());

  const _controlGroups = ControlGroups(_,  validParameters);
  const _form = _controlGroups.createForm();
  let _valid = null;

  const _parameterTemplateOf = control => `flow-${control.kind}-model-parameter`;

  const findParameter = name => find(validParameters, p => p.name === name);

  const _collectParameters = function(...args) {
    const val = args[0], obj = val != null ? val : {}, val1 = obj.includeUnchangedParameters, includeUnchangedParameters = val1 != null ? val1 : false, val2 = obj.flat, flat = val2 != null ? val2 : true;
    const controls = flatten(_controlGroups.list);
    const parameters = {};
    for (let control of Array.from(controls)) {
      const value = _controlGroups.readControlValue(control);
      if ((value != null) && control.isVisible() && (includeUnchangedParameters || control.isRequired || (control.defaultValue !== value))) {
        if (flat) {
          parameters[control.name] = value;
        } else {
          const nested = (findParameter(control.name)).path.split('.');
          p = parameters;
          let level = 0;
          for (let token of Array.from(nested)) {
            level += 1;
            if ((p[token] == null)) {
              p[token] = {};
            }
            p = p[token];
            if (level === nested.length) {
              p[control.name] = value;
            }
          }
        }
      }
    }
    return parameters;
  };

  // bind controls that depend on each other
  (function() {
    const [ trainingFrame,
      response,
      ignoredColumns,
      monotoneConstraints,
      balanceClasses,
      classSamplingFactors,
      maxAfterBalanceSize,
      distribution,
      customDistributionFunc,
      huberAlpha,
      tweediePower,
      quantileAlpha,
    ] = Array.from(map([
      'training_frame',
      'response_column',
      'ignored_columns',
      'monotone_constraints',
      'balance_classes',
      'class_sampling_factors',
      'max_after_balance_size',
      'distribution',
      'custom_distribution_func',
      'huber_alpha',
      'tweedie_power',
      'quantile_alpha',
    ], _controlGroups.findControl));
    const columnControls = map(columnParameterNames, _controlGroups.findControl);

    _valid = lift(trainingFrame.value, response.value, (training, response) => (training != null) && (response != null));

    const populateColumns = function(columns) {
      const colNames = (Array.from(columns).map((c) => c.value));
      for (let colControl of Array.from(columnControls)) {
        colControl.values(colNames);
        const paramValue = (findParameter(colControl.name)).value;
        if (Array.from(colNames).includes(paramValue)) {
          colControl.value(paramValue);
        }
      }

      const ignoredColValue = (findParameter(ignoredColumns.name)).value;
      ignoredColumns.value(ignoredColValue != null ? ignoredColValue : []);
      ignoredColumns.values(columns);

      const mcValue = (findParameter(monotoneConstraints.name)).value;
      monotoneConstraints.value(mcValue != null ? mcValue : []);
      return monotoneConstraints.columns(colNames);
    };

    act(trainingFrame.value, function(frameId) {
      if (frameId) {
        return _.requestFrameSummaryWithoutData(frameId, function(error, frame) {
          if (!error) {
            const columns = columnLabelsFromFrame(frame);
            return populateColumns(columns);
          }
        });
      } else {
        return populateColumns([]);
      }
  });

    act(balanceClasses.value, function(enabled) {
      classSamplingFactors.isVisible(enabled);
      return maxAfterBalanceSize.isVisible(enabled);
    });

    return act(distribution.value, function(distribution) {
      huberAlpha.isVisible(distribution === "huber");
      tweediePower.isVisible(distribution === "tweedie");
      quantileAlpha.isVisible(distribution === "quantile");
      return customDistributionFunc.isVisible(distribution === "custom");
    });
  })();


  return {
    exception: _exception,
    form: _form,
    collectParameters: _collectParameters,
    parameterTemplateOf: _parameterTemplateOf,
    valid: _valid,
    hasValidationFailures: _hasValidationFailures,
    validationFailureMessage: _validationFailureMessage
  };
};


module.exports = function(_, _go, _opts) {
  const _automlForm = signal(null);
  const _canRunAutoML = signal(null);
  const _exception = signal(null);
  react(_automlForm, function(aml) {
    if (aml != null) {
      merge(aml.valid, _canRunAutoML, identity);
      return merge(aml.exception, _exception, identity);
    }
  });

  const performValidations = function(checkForErrors, go) {
    _exception(null);
    // parameters = _automlForm().collectParameters {includeUnchangedParameters: yes}
    // AutoML doesn't support server side validation yet, but this could be a useful addition.
    return go();
  };

  const _runAutoML = function() {
    _exception(null);
    return performValidations(true, function() {
      const parameters = _automlForm().collectParameters({flat: false});
      return _.insertAndExecuteCell('cs', `runAutoML ${stringify(parameters)}, 'exec'`);
    });
  };

  const findSchemaField = function(schema, name) {
    for (let field of Array.from(schema.fields)) {
      if (field.schema_name === name) {
        return field;
      }
    }
  };

  const loadFields = (schema_name, path, with_fields) => _.requestSchema(schema_name, function(error, response) {
    if (error) {
      return with_fields(null, error);
    } else {
      const schema = head(response.schemas);
      return with_fields(schema.fields, path);
    }
  });

  const requestBuilderParameters = function(go) {
    const waiting = signal(0);
    const parameters = [];
    var acc = function(fields, path) {
      if (fields === null) {
        go(path, null);
        return;
      }
      for (let field of Array.from(fields)) {
        if (field.is_schema && (field.value != null ? field.value.__meta : undefined)) {
          const fpath = path === '' ? field.name : path+'.'+field.name;
          waiting(waiting()+1);
          loadFields(field.schema_name, fpath, acc);
        } else if (['INPUT', 'INOUT'].includes(field.direction)) {
          field.path = path;
          parameters.push(field);
        }
      }
      return waiting(waiting()-1);
    };

    waiting(waiting()+1);
    loadFields('AutoMLBuildSpecV99', '', acc);
    return react(waiting, function(w) { if (w === 0) { return go(null, parameters); } });
  };

  const loadFrameIds = go => _.requestFrames(function(error, frames) {
    if (!error) {
       return go(null, (Array.from(frames).map((frame) => frame.frame_id.name)));
    } else {
       return go(error, null);
     }
  });

  const populateFrames = (_frames, parameters, go) => act(_frames, function(frames) {
    const frameParameters = (Array.from(parameters).filter((p) => p.type === 'Key<Frame>'));
    for (let frame of Array.from(frameParameters)) {
      frame.values = frames;
    }
    return go();
  });

  const flattenParams = function(params) {
    if (isPlainObject(params)) {
      const flatParams = {};
      var collect = (kvs, target) => (() => {
        const result = [];
        for (let k in kvs) {
          const v = kvs[k];
          if (isPlainObject(v)) {
            result.push(collect(v, target));
          } else {
            result.push(target[k] = v);
          }
        }
        return result;
      })();
      collect(params, flatParams);
      return flatParams;
    } else {
      return params;
    }
  };

  (function() {
    const _frames = signals([]);
    loadFrameIds((error, ids) => _frames(ids));
    return requestBuilderParameters(function(error, parameters)  {
      if (!error) {
        return populateFrames(_frames, parameters, () => _automlForm(AutoMLForm(_, parameters, flattenParams(_opts))));
      }
    });
  })();

  defer(_go);

  return {
    automlForm: _automlForm,
    canRunAutoML: _canRunAutoML,
    runAutoML: _runAutoML,
    template: 'flow-automl-input'
  };
};


