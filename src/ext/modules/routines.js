/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * DS201: Simplify complex destructure assignments
 * DS202: Simplify dynamic range loops
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Plotly = require('plotly.js');

const { flatten, compact, keyBy, findIndex, isFunction, isArray,
  map, uniq, head, keys, range, escape, sortBy, some, 
  tail, concat, values } = require('lodash');
const { isObject, isNumber } = require('../../core/modules/prelude');

const { words, typeOf, stringify } = require('../../core/modules/prelude');
const { act, react, lift, link, merge, isSignal, signal, signals } = require("../../core/modules/dataflow");
const { TString, TNumber } = require('../../core/modules/types');
const async = require('../../core/modules/async');
const html = require('../../core/modules/html');
const FlowError = require('../../core/modules/flow-error');
const objectBrowser = require('../../core/components/object-browser');
const util = require('../../core/modules/util');
let gui = require('../../core/modules/gui');
const form = require('../../core/components/form');
const h2o = require('./h2o');
const lightning = require('../../core/modules/lightning');

const _assistance = {
  importFiles: {
    description: 'Import file(s) into H<sub>2</sub>O',
    icon: 'files-o'
  },
  importSqlTable: {
    description: 'Import SQL table into H<sub>2</sub>O',
    icon: 'table'
  },
  getFrames: {
    description: 'Get a list of frames in H<sub>2</sub>O',
    icon: 'table'
  },
  splitFrame: {
    description: 'Split a frame into two or more frames',
    icon: 'scissors'
  },
  mergeFrames: {
    description: 'Merge two frames into one',
    icon: 'link'
  },
  getModels: {
    description: 'Get a list of models in H<sub>2</sub>O',
    icon: 'cubes'
  },
  getGrids: {
    description: 'Get a list of grid search results in H<sub>2</sub>O',
    icon: 'th'
  },
  getPredictions: {
    description: 'Get a list of predictions in H<sub>2</sub>O',
    icon: 'bolt'
  },
  getJobs: {
    description: 'Get a list of jobs running in H<sub>2</sub>O',
    icon: 'tasks'
  },
  runAutoML: {
    description: 'Automatically train and tune many models',
    icon: 'sitemap'
  },
  buildModel: {
    description: 'Build a model',
    icon: 'cube'
  },
  importModel: {
    description: 'Import a saved model',
    icon: 'cube'
  },
  predict: {
    description: 'Make a prediction',
    icon: 'bolt'
  }
};

const parseNumbers = function(source) {
  const target = new Array(source.length);
  for (let i = 0; i < source.length; i++) {
    const value = source[i];
    target[i] = value === 'NaN' ?
      undefined
    : value === 'Infinity' ?
      Number.POSITIVE_INFINITY //TODO handle formatting
    : value === '-Infinity' ?
      Number.NEGATIVE_INFINITY //TODO handle formatting
    :
      value;
  }
  return target;
};

const convertColumnToVector = function(column, data) {
  switch (column.type) {
    case 'byte': case 'short': case 'int': case 'integer': case 'long':
      return lightning.createVector(column.name, TNumber, parseNumbers(data));
    case 'float': case 'double':
      return lightning.createVector(column.name, TNumber, (parseNumbers(data)), format4f);
    case 'string':
      return lightning.createFactor(column.name, TString, data);
    case 'matrix':
      return lightning.createList(column.name, data, formatConfusionMatrix);
    default:
      return lightning.createList(column.name, data);
  }
};

const convertTableToFrame = function(table, tableName, metadata) {
  //TODO handle format strings and description
  const vectors = Array.from(table.columns).map((column, i) =>
    convertColumnToVector(column, table.data[i]));
  return lightning.createDataFrame(tableName, vectors, (range(table.rowcount)), null, metadata);
};

const getTwoDimData = function(table, columnName) {
  const columnIndex = findIndex(table.columns, column => column.name === columnName);
  if (columnIndex >= 0) {
    return table.data[columnIndex];
  } else {
    return undefined;
  }
};

var format4f = function(number) {
  if (number) {
    if (number === 'NaN') {
      return undefined;
    } else {
      return number.toFixed(4).replace(/\.0+$/, '.0');
    }
  } else {
    return number;
  }
};

const format6fi = function(number) {
  if (number) {
    if (number === 'NaN') {
      return undefined;
    } else {
      return number.toFixed(6).replace(/\.0+$/, '');
    }
  } else {
    return number;
  }
};

const combineTables = function(tables) {
  let table;
  const leader = head(tables);

  let rowCount = 0;
  const columnCount = leader.data.length;
  const data = new Array(columnCount);

  for (table of Array.from(tables)) {
    rowCount += table.rowcount;
  }

  for (let i = 0, end = columnCount, asc = 0 <= end; asc ? i < end : i > end; asc ? i++ : i--) {
    var columnData;
    data[i] = (columnData = new Array(rowCount));
    let index = 0;
    for (table of Array.from(tables)) {
      for (let element of Array.from(table.data[i])) {
        columnData[index++] = element;
      }
    }
  }

  return {
    name: leader.name,
    columns: leader.columns,
    data,
    rowcount: rowCount
  };
};

const createArrays = (count, length) => __range__(0, count, false).map((i) =>
  new Array(length));

const parseNaNs = function(source) {
  const target = new Array(source.length);
  for (let i = 0; i < source.length; i++) {
    const element = source[i];
    target[i] = element === 'NaN' ? undefined : element;
  }
  return target;
};

const parseNulls = function(source) {
  const target = new Array(source.length);
  for (let i = 0; i < source.length; i++) {
    const element = source[i];
    target[i] = (element != null) ? element : undefined;
  }
  return target;
};

const parseAndFormatArray = function(source) {
  const target = new Array(source.length);
  for (let i = 0; i < source.length; i++) {
    const element = source[i];
    target[i] = (element != null) ?
      isNumber(element) ?
        format6fi(element)
      :
        element
    :
      undefined;
  }
  return target;
};

const parseAndFormatObjectArray = function(source) {
  const target = new Array(source.length);
  for (let i = 0; i < source.length; i++) {
    const element = source[i];
    target[i] = (element != null) ?
      (element.__meta != null ? element.__meta.schema_type : undefined) === 'Key<Model>' ?
        `<a href='#' data-type='model' data-key=${stringify(element.name)}>${escape(element.name)}</a>`
      : (element.__meta != null ? element.__meta.schema_type : undefined) === 'Key<Frame>' ?
        `<a href='#' data-type='frame' data-key=${stringify(element.name)}>${escape(element.name)}</a>`
      :
        element
    :
      undefined;
  }
  return target;
};

const repeatValues = function(count, value) {
  const target = new Array(count);
  for (let i = 0, end = count, asc = 0 <= end; asc ? i < end : i > end; asc ? i++ : i--) {
    target[i] = value;
  }
  return target;
};

const concatArrays = function(arrays) {
  switch (arrays.length) {
    case 0:
      return [];
    case 1:
      return head(arrays);
    default:
      var a = head(arrays);
      return a.concat.apply(a, tail(arrays));
  }
};

const computeTruePositiveRate = function(cm) {
  const [tn, fp] = Array.from(cm[0]), [fn, tp] = Array.from(cm[1]);
  return tp / (tp + fn);
};

const computeFalsePositiveRate = function(cm) {
  const [tn, fp] = Array.from(cm[0]), [fn, tp] = Array.from(cm[1]);
  return fp / (fp + tn);
};

var formatConfusionMatrix = function(cm) {
  const [tn, fp] = Array.from(cm.matrix[0]), [fn, tp] = Array.from(cm.matrix[1]);
  const fnr = fn / (tp + fn);
  const fpr = fp / (fp + tn);
  const {
    domain
  } = cm;

  const [ table, tbody, tr, strong, normal, yellow ] = Array.from(html.template('table.flow-matrix', 'tbody', 'tr', 'td.strong.flow-center', 'td', 'td.bg-yellow'));

  return table([
    tbody([
      tr([
        strong('Actual/Predicted'),
        strong(domain[0]),
        strong(domain[1]),
        strong('Error'),
        strong('Rate')
      ]),
      tr([
        strong(domain[0]),
        yellow(tn),
        normal(fp),
        normal(format4f(fpr)),
        normal(fp + ' / ' + (fp + tn))
      ]),
      tr([
        strong(domain[1]),
        normal(fn),
        yellow(tp),
        normal(format4f(fnr)),
        normal(fn + ' / ' + (tp + fn))
      ]),
      tr([
        strong('Total'),
        strong(tn + fn),
        strong(tp + fp),
        strong(format4f((fn + fp) / (fp + tn + tp + fn))),
        strong((fn + fp) + ' / ' + (fp + tn + tp + fn))
      ])
    ])
  ]);
};

const formulateGetPredictionsOrigin = function(opts) {
  if (isArray(opts)) {
    const sanitizedOpts = (() => {
      const result = [];
      for (let opt of Array.from(opts)) {
        const sanitizedOpt = {};
        if (opt.model) { sanitizedOpt.model = opt.model; }
        if (opt.frame) { sanitizedOpt.frame = opt.frame; }
        result.push(sanitizedOpt);
      }
      return result;
    })();
    return `getPredictions ${stringify(sanitizedOpts)}`;
  } else {
    const { model: modelKey, frame: frameKey } = opts;
    if (modelKey && frameKey) {
      return `getPredictions model: ${stringify(modelKey)}, frame: ${stringify(frameKey)}`;
    } else if (modelKey) {
      return `getPredictions model: ${stringify(modelKey)}`;
    } else if (frameKey) {
      return `getPredictions frame: ${stringify(frameKey)}`;
    } else {
      return "getPredictions()";
    }
  }
};

exports.init = function(_) {
  //TODO move these into async
  let f, name;
  const _fork = (f, ...args) => async.fork(f, args);
  const _join = function(...args1) { const adjustedLength = Math.max(args1.length, 1), args = args1.slice(0, adjustedLength - 1), go = args1[adjustedLength - 1]; return async.join(args, async.applicate(go)); };
  const _call = (go, ...args) => async.join(args, async.applicate(go));
  const _apply = (go, args) => async.join(args, go);
  const _isFuture = async.isFuture;
  const _async = async.async;
  const _get = async.get;

  //XXX obsolete
  let proceed = (func, args, go) => go(null, render_({}, () => func.apply(null, [_].concat(args || []))));

  proceed = (func, args, go) => go(null, render_.apply(null, [ {}, func, ].concat(args || [])));

  const extendGuiForm = f => render_(f, form, f);

  const createGui = (controls, go) => go(null, extendGuiForm(signals(controls || [])));

  gui = controls => _fork(createGui, controls);

  for (name in gui) { f = gui[name]; gui[name] = f; }

  const flow_ = raw => raw._flow_ || (raw._flow_ = {_cache_: {}});

  //XXX obsolete
  var render_ = function(raw, render) {
    (flow_(raw)).render = render;
    return raw;
  };

  render_ = function(raw, render, ...args) {
    (flow_(raw)).render = go => // Prepend current context (_) and a continuation (go)
    render.apply(null, [_, go].concat(args));
    return raw;
  };

  const inspect_ = function(raw, inspectors) {
    const root = flow_(raw);
    if (root.inspect == null) { root.inspect = {}; }
    for (let attr in inspectors) {
      f = inspectors[attr];
      root.inspect[attr] = f;
    }
    return raw;
  };

  const inspect = function(a, b) {
    if (arguments.length === 1) {
      return inspect$1(a);
    } else {
      return inspect$2(a, b);
    }
  };

  var inspect$1 = function(obj) {
    if (_isFuture(obj)) {
      return _async(inspect, obj);
    } else {
      let inspectors;
      if (inspectors = __guard__(obj != null ? obj._flow_ : undefined, x => x.inspect)) {
        const inspections = [];
        for (let attr in inspectors) {
          f = inspectors[attr];
          inspections.push(inspect$2(attr, obj));
        }
        render_(inspections, h2o.InspectsOutput, inspections);
        return inspections;
      } else {
        return {};
      }
    }
  };

  var ls = function(obj) {
    if (_isFuture(obj)) {
      return _async(ls, obj);
    } else {
      let inspectors;
      if ((inspectors = __guard__(obj != null ? obj._flow_ : undefined, x => x.inspect))) {
        return keys(inspectors);
      } else {
        return [];
      }
    }
  };

  var inspect$2 = function(attr, obj) {
    let cached, inspection, inspectors, key, root;
    if (!attr) { return; }
    if (_isFuture(obj)) { return _async(inspect, attr, obj); }
    if (!obj) { return; }
    if (!(root = obj._flow_)) { return; }
    if (!(inspectors = root.inspect)) { return; }
    if (cached = root._cache_[ (key = `inspect_${attr}`) ]) { return cached; }
    if (!(f = inspectors[attr])) { return; }
    if (!isFunction(f)) { return; }
    root._cache_[key] = (inspection = f());
    render_(inspection, h2o.InspectOutput, inspection);
    return inspection;
  };

  const _plot = (render, go) => render(function(error, vis) {
    if (error) {
      return go(new FlowError('Error rendering vis.', error));
    } else {
      return go(null, vis);
    }
  });

  const extendPlot = vis => render_(vis, h2o.PlotOutput, vis.element);

  const createLightningPlot = (f, go) => _plot((f(lightning)), function(error, vis) {
    if (error) {
      return go(error);
    } else {
      return go(null, extendPlot(vis));
    }
  });

  var plot = function(f) {
    if (_isFuture(f)) {
      return _fork(proceed, h2o.PlotInput, f);
    } else if (isFunction(f)) {
      return _fork(createLightningPlot, f);
    } else {
      return assist(plot);
    }
  };

  const createPlotlyPlot = (f, go) => _plot((f(Plotly)), function(error, vis) {
    if (error) {
      return go(error);
    } else {
      return go(null, extendPlot(vis));
    }
  });

  const plotlyPlot = f => _fork(createPlotlyPlot, f);

  const grid = f => plot(g => g(
    g.select(),
    g.from(f)
  ));

  const transformBinomialMetrics = function(metrics) {
    let scores;
    if (scores = metrics.thresholds_and_metric_scores) {
      const {
        domain
      } = metrics;
      const tps = getTwoDimData(scores, 'tps');
      const tns = getTwoDimData(scores, 'tns');
      const fps = getTwoDimData(scores, 'fps');
      const fns = getTwoDimData(scores, 'fns');

      const cms = Array.from(tps).map((tp, i) => ({
        domain,
        matrix: [[tns[i], fps[i]], [fns[i], tp]]
      }));

      scores.columns.push({
        name: 'CM',
        description: 'CM',
        format: 'matrix', //TODO HACK
        type: 'matrix'
      });
      scores.data.push(cms);
    }

    return metrics;
  };

  const extendCloud = cloud => render_(cloud, h2o.CloudOutput, cloud);

  const extendTimeline = timeline => render_(timeline, h2o.TimelineOutput, timeline);

  const extendStackTrace = stackTrace => render_(stackTrace, h2o.StackTraceOutput, stackTrace);

  const extendLogFile = (cloud, nodeIpPort, fileType, logFile) => render_(logFile, h2o.LogFileOutput, cloud, nodeIpPort, fileType, logFile);

  const inspectNetworkTestResult = testResult => () => convertTableToFrame(testResult.table, testResult.table.name, {
    description: testResult.table.name,
    origin: "testNetwork"
  }
  );

  const extendNetworkTest = function(testResult) {
    inspect_(testResult,
      {result: inspectNetworkTestResult(testResult)});
    return render_(testResult, h2o.NetworkTestOutput, testResult);
  };

  const extendProfile = profile => render_(profile, h2o.ProfileOutput, profile);

  const extendFrames = function(frames) {
    render_(frames, h2o.FramesOutput, frames);
    return frames;
  };

  const extendSplitFrameResult = function(result) {
    render_(result, h2o.SplitFrameOutput, result);
    return result;
  };

  const extendMergeFramesResult = function(result) {
    render_(result, h2o.MergeFramesOutput, result);
    return result;
  };

  const extendPartialDependence= function(result) {
    const inspections = {};
    for (let i = 0; i < result.partial_dependence_data.length; i++) {
      const data = result.partial_dependence_data[i];
      const origin = `getPartialDependence ${stringify(result.destination_key)}`;
      inspections[`plot${i+1}`] = inspectTwoDimTable_(origin, `plot${i+1}`, data);
    }
    inspect_(result, inspections);
    render_(result, h2o.PartialDependenceOutput, result);
    return result;
  };

  const getModelParameterValue = function(type, value) {
    switch (type) {
      case 'Key<Frame>': case 'Key<Model>':
        if (value != null) { return value.name; } else { return undefined; }
      case 'VecSpecifier':
        if (value != null) { return value.column_name; } else { return undefined; }
      default:
        if (value != null) { return value; } else { return undefined; }
    }
  };

  const inspectParametersAcrossModels = models => (function() {
    let model;
    const leader = head(models);
    const vectors = (() => {
      const result = [];
      for (var i = 0; i < leader.parameters.length; i++) {
        var parameter = leader.parameters[i];
        const data = (() => {
          const result1 = [];
          for (model of Array.from(models)) {
            result1.push(getModelParameterValue(parameter.type, model.parameters[i].actual_value));
          }
          return result1;
        })();
        switch (parameter.type) {
          case 'enum': case 'Frame': case 'string':
            result.push(lightning.createFactor(parameter.label, TString, data));
            break;
          case 'byte': case 'short': case 'int': case 'long': case 'float': case 'double':
            result.push(lightning.createVector(parameter.label, TNumber, data));
            break;
          case 'string[]': case 'byte[]': case 'short[]': case 'int[]': case 'long[]': case 'float[]': case 'double[]':
            result.push(lightning.createList(parameter.label, data, function(a) { if (a) { return a; } else { return undefined; } }));
            break;
          case 'boolean':
            result.push(lightning.createList(parameter.label, data, function(a) { if (a) { return 'true'; } else { return 'false'; } }));
            break;
          default:
            result.push(lightning.createList(parameter.label, data));
        }
      }
      return result;
    })();

    const modelKeys = ((() => {
      const result2 = [];
      for (model of Array.from(models)) {         result2.push(model.model_id.name);
      }
      return result2;
    })());

    return lightning.createDataFrame('parameters', vectors, (range(models.length)), null, {
      description: `Parameters for models ${modelKeys.join(', ')}`,
      origin: `getModels ${stringify(modelKeys)}`
    }
    );
  });

  const inspectModelParameters = model => (function() {
    const {
      parameters
    } = model;

    const attrs = [
      'label',
      'type',
      'level',
      'actual_value',
      'default_value'
    ];

    const vectors = (() => {
      const result = [];
      for (let attr of Array.from(attrs)) {
        const data = new Array(parameters.length);
        for (let i = 0; i < parameters.length; i++) {
          const parameter = parameters[i];
          data[i] = attr === 'actual_value' ?
            getModelParameterValue(parameter.type, parameter[attr])
          :
            parameter[attr];
        }
        result.push(lightning.createList(attr, data));
      }
      return result;
    })();

    return lightning.createDataFrame('parameters', vectors, (range(parameters.length)), null, {
      description: `Parameters for model '${model.model_id.name}'`, //TODO frame model_id
      origin: `getModel ${stringify(model.model_id.name)}`
    }
    );
  });

  const extendJob = job => render_(job, h2o.JobOutput, job);

  const extendJobs = function(jobs) {
    for (let job of Array.from(jobs)) {
      extendJob(job);
    }
    return render_(jobs, h2o.JobsOutput, jobs);
  };

  const extendCancelJob = cancellation => render_(cancellation, h2o.CancelJobOutput, cancellation);

  const extendDeletedKeys = keys => render_(keys, h2o.DeleteObjectsOutput, keys);

  var inspectTwoDimTable_ = (origin, tableName, table) => () => convertTableToFrame(table, tableName, {
    description: table.description || '',
    origin
  }
  );

  const inspectRawArray_ = (name, origin, description, array) => () => lightning.createDataFrame(name, [lightning.createList(name, parseAndFormatArray(array))], (range(array.length)), null, {
    description: '',
    origin
  }
  );

  const inspectObjectArray_ = (name, origin, description, array) => () => lightning.createDataFrame(name, [lightning.createList(name, parseAndFormatObjectArray(array))], (range(array.length)), null, {
    description: '',
    origin
  }
  );

  const inspectRawObject_ = (name, origin, description, obj) => (function() {
    const vectors = (() => {
      const result = [];
      for (let k in obj) {
        const v = obj[k];
        result.push(lightning.createList(k, [ v === null ? undefined : isNumber(v) ? format6fi(v) : v ]));
      }
      return result;
    })();

    return lightning.createDataFrame(name, vectors, (range(1)), null, {
      description: '',
      origin
    }
    );
  });

  const _globalHacks =
    {fields: 'reproducibility_information_table'};

  const _schemaHacks = {
    KMeansOutput: {
      fields: 'names domains help'
    },
    GBMOutput: {
      fields: 'names domains help'
    },
    GLMOutput: {
      fields: 'names domains help'
    },
    DRFOutput: {
      fields: 'names domains help'
    },
    DeepLearningModelOutput: {
      fields: 'names domains help'
    },
    NaiveBayesOutput: {
      fields: 'names domains help pcond'
    },
    PCAOutput: {
      fields: 'names domains help'
    },
    ModelMetricsBinomialGLM: {
      fields: null,
      transform: transformBinomialMetrics
    },
    ModelMetricsBinomial: {
      fields: null,
      transform: transformBinomialMetrics
    },
    ModelMetricsMultinomialGLM: {
      fields: null
    },
    ModelMetricsMultinomial: {
      fields: null
    },
    ModelMetricsRegressionGLM: {
      fields: null
    },
    ModelMetricsRegression: {
      fields: null
    },
    ModelMetricsClustering: {
      fields: null
    },
    ModelMetricsAutoEncoder: {
      fields: null
    },
    ConfusionMatrix: {
      fields: null
    }
  };

  const blacklistedAttributesBySchema = (function() {
    const dicts = {};
    for (let schema in _schemaHacks) {
      var dict;
      const attrs = _schemaHacks[schema];
      dicts[schema] = (dict = {__meta: true});
      if (attrs.fields) {
        for (let field of Array.from(words(attrs.fields))) {
          dict[field] = true;
        }
      }
    }
    return dicts;
  })();

  const blacklistedAttributesSchemaIndependent = (function() {
    const dict = {};
    for (let attrs in _globalHacks) {
      if (attrs = 'fields') {
        for (let field of Array.from(words(_globalHacks[attrs]))) {
          dict[field] = true;
        }
      }
    }
    return dict;
  })();

  const schemaTransforms = (function() {
    const transforms = {};
    for (let schema in _schemaHacks) {
      var transform;
      const attrs = _schemaHacks[schema];
      if (transform = attrs.transform) {
        transforms[schema] = transform;
      }
    }
    return transforms;
  })();

  var inspectObject = function(inspections, name, origin, obj) {
    let transform;
    const blacklistedAttributes = blacklistedAttributesSchemaIndependent;

    const schemaType = obj.__meta != null ? obj.__meta.schema_type : undefined;
    if (schemaType) {
      let attrs;
      if (attrs = blacklistedAttributesBySchema[schemaType]) {
        for (let key in attrs) {
          const value = attrs[key];
          blacklistedAttributes[key] = value;
        }
      }
    }

    if (transform = schemaTransforms[schemaType]) { obj = transform(obj); }

    const record = {};

    inspections[name] = inspectRawObject_(name, origin, name, record);

    for (let k in obj) {
      const v = obj[k];
      if (!blacklistedAttributes[k]) {
        if (v === null) {
          record[k] = null;
        } else {
          if ((v.__meta != null ? v.__meta.schema_type : undefined) === 'TwoDimTable') {
            inspections[`${name} - ${v.name}`] = inspectTwoDimTable_(origin, `${name} - ${v.name}`, v);
          } else {
            if (isArray(v)) {
              if ((k === 'cross_validation_models') || (k === 'cross_validation_predictions') || ((name === 'output') && ((k === 'weights') || (k === 'biases')))) { // megahack
                inspections[k] = inspectObjectArray_(k, origin, k, v);
              } else {
                inspections[k] = inspectRawArray_(k, origin, k, v);
              }
            } else if (isObject(v)) {
              var meta;
              if ((meta = v.__meta)) {
                if (meta.schema_type === 'Key<Frame>') {
                  record[k] = `<a href='#' data-type='frame' data-key=${stringify(v.name)}>${escape(v.name)}</a>`;
                } else if (meta.schema_type === 'Key<Model>') {
                  record[k] = `<a href='#' data-type='model' data-key=${stringify(v.name)}>${escape(v.name)}</a>`;
                } else if (meta.schema_type === 'Frame') {
                  record[k] = `<a href='#' data-type='frame' data-key=${stringify(v.frame_id.name)}>${escape(v.frame_id.name)}</a>`;
                } else {
                  inspectObject(inspections, `${name} - ${k}`, origin, v);
                }
              } else {
                console.log(`WARNING: dropping [${k}] from inspection:`, v);
              }
            } else {
              record[k] = isNumber(v) ? format6fi(v) : v;
            }
          }
        }
      }
    }

  };

  const extendModel = function(model) {

    const extend = function(model) {
      const inspections = {};
      inspections.parameters = inspectModelParameters(model);
      const origin = `getModel ${stringify(model.model_id.name)}`;
      inspectObject(inspections, 'output', origin, model.output);

      // Obviously, an array of 2d tables calls for a megahack.
      if (model.__meta.schema_type === 'NaiveBayesModel') {
        if (isArray(model.output.pcond)) {
          for (let table of Array.from(model.output.pcond)) {
            const tableName = `output - pcond - ${table.name}`;
            inspections[tableName] = inspectTwoDimTable_(origin, tableName, table);
          }
        }
      }

      inspect_(model, inspections);
      return model;
    };

    const refresh = go => _.requestModel(model.model_id.name, function(error, model) {
      if (error) { return go(error); } else { return go(null, extend(model)); }
    });

    extend(model);

    return render_(model, h2o.ModelOutput, model, refresh);
  };

  const extendGrid = function(grid, opts) {
    let origin = `getGrid ${stringify(grid.grid_id.name)}`;
    if (opts) { origin += `, ${stringify(opts)}`; }
    const inspections = {
      summary: inspectTwoDimTable_(origin, "summary", grid.summary_table),
      scoring_history: inspectTwoDimTable_(origin, "scoring_history", grid.scoring_history)
    };
    inspect_(grid, inspections);
    return render_(grid, h2o.GridOutput, grid);
  };

  const extendGrids = grids => render_(grids, h2o.GridsOutput, grids);

  const extendLeaderboard = result => render_(result, h2o.LeaderboardOutput, result);

  const extendModels = function(models) {
    const inspections = {};

    const algos = uniq((Array.from(models).map((model) => model.algo)));
    if (algos.length === 1) {
      inspections.parameters = inspectParametersAcrossModels(models);
    }

    // modelCategories = uniq (model.output.model_category for model in models)
    // TODO implement model comparision after 2d table cleanup for model metrics
    //if modelCategories.length is 1
    //  inspections.outputs = inspectOutputsAcrossModels (head modelCategories), models

    inspect_(models, inspections);
    return render_(models, h2o.ModelsOutput, models);
  };

  const read = function(value) { if (value === 'NaN') { return null; } else { return value; } };

  const extendPredictions = function(opts, predictions) {
    render_(predictions, h2o.PredictsOutput, opts, predictions);
    return predictions;
  };

  const extendPrediction = function(result) {
    const modelKey = result.model.name;
    const frameKey = result.frame != null ? result.frame.name : undefined;
    let prediction = head(result.model_metrics);
    const predictionFrame = result.predictions_frame === null ? (result.frame != null) : result.predictions_frame;

    const inspections = {};
    if (prediction) {
      inspectObject(inspections, 'Prediction', `getPrediction model: ${stringify(modelKey)}, frame: ${stringify(frameKey)}`, prediction);
    } else {
      prediction = {};
      inspectObject(inspections, 'Prediction', `getPrediction model: ${stringify(modelKey)}, frame: ${stringify(frameKey)}`, { prediction_frame: predictionFrame });
    }

    inspect_(prediction, inspections);
    return render_(prediction, h2o.PredictOutput, modelKey, frameKey, predictionFrame, prediction);
  };

  const inspectFrameColumns = (tableLabel, frameKey, frame, frameColumns) => (function() {
    let column;
    const attrs = [
      'label',
      'type',
      'missing_count|Missing',
      'zero_count|Zeros',
      'positive_infinity_count|+Inf',
      'negative_infinity_count|-Inf',
      'min',
      'max',
      'mean',
      'sigma',
      'cardinality'
    ];

    const toColumnSummaryLink = label => `<a href='#' data-type='summary-link' data-key=${stringify(label)}>${escape(label)}</a>`;

    const toConversionLink = function(value) {
      const [ type, label ] = Array.from(value.split('\0'));
      switch (type) {
        case 'enum':
          return `<a href='#' data-type='as-numeric-link' data-key=${stringify(label)}>Convert to numeric</a>`;
        case 'int': case 'string':
          return `<a href='#' data-type='as-factor-link' data-key=${stringify(label)}>Convert to enum</a>`;
        default:
          return undefined;
      }
    };

    const vectors = (() => {
      const result = [];
      for (let attr of Array.from(attrs)) {
        let title;
        [ name, title ] = Array.from(attr.split('|'));
        title = title != null ? title : name;
        switch (name) {
          case 'min':
            result.push(lightning.createVector(title, TNumber, ((() => {
              const result1 = [];
              for (column of Array.from(frameColumns)) {                 result1.push(head(column.mins));
              }
              return result1;
            })()), format4f));
            break;
          case 'max':
            result.push(lightning.createVector(title, TNumber, ((() => {
              const result2 = [];
              for (column of Array.from(frameColumns)) {                 result2.push(head(column.maxs));
              }
              return result2;
            })()), format4f));
            break;
          case 'cardinality':
            result.push(lightning.createVector(title, TNumber, ((() => {
              const result3 = [];
              for (column of Array.from(frameColumns)) {                 if (column.type === 'enum') { result3.push(column.domain_cardinality); } else { result3.push(undefined); }
              }
              return result3;
            })())));
            break;
          case 'label':
            result.push(lightning.createFactor(title, TString, ((() => {
              const result4 = [];
              for (column of Array.from(frameColumns)) {                 result4.push(column[name]);
              }
              return result4;
            })()), null, toColumnSummaryLink));
            break;
          case 'type':
            result.push(lightning.createFactor(title, TString, ((() => {
              const result5 = [];
              for (column of Array.from(frameColumns)) {                 result5.push(column[name]);
              }
              return result5;
            })())));
            break;
          case 'mean': case 'sigma':
            result.push(lightning.createVector(title, TNumber, ((() => {
              const result6 = [];
              for (column of Array.from(frameColumns)) {                 result6.push(column[name]);
              }
              return result6;
            })()), format4f));
            break;
          default:
            result.push(lightning.createVector(title, TNumber, ((() => {
              const result7 = [];
              for (column of Array.from(frameColumns)) {                 result7.push(column[name]);
              }
              return result7;
            })())));
        }
      }
      return result;
    })();

    const [ labelVector, typeVector ] = Array.from(vectors);
    const actionsData = __range__(0, frameColumns.length, false).map((i) =>
      `${typeVector.valueAt(i)}\0${labelVector.valueAt(i)}`);
    vectors.push(lightning.createFactor('Actions', TString, actionsData, null, toConversionLink));

    return lightning.createDataFrame(tableLabel, vectors, (range(frameColumns.length)), null, {
      description: `A list of ${tableLabel} in the H2O Frame.`,
      origin: `getFrameSummary ${stringify(frameKey)}`,
      plot: `plot inspect '${tableLabel}', getFrameSummary ${stringify(frameKey)}`
    }
    );
  });

  const inspectFrameData = (frameKey, frame) => (function() {
    const frameColumns = frame.columns;

    const vectors = (() => {
      const result = [];
      for (let column of Array.from(frameColumns)) {
      //XXX format functions
        switch (column.type) {
          case 'int': case 'real':
            result.push(lightning.createVector(column.label, TNumber, (parseNaNs(column.data)), format4f));
            break;
          case 'enum':
            var {
              domain
            } = column;
            result.push(lightning.createFactor(column.label, TString, (Array.from(column.data).map((index) => ((index != null) ? domain[index] : undefined)))));
            break;
          case 'time':
            result.push(lightning.createVector(column.label, TNumber, parseNaNs(column.data)));
            break;
          case 'string': case 'uuid':
            result.push(lightning.createList(column.label, parseNulls(column.string_data)));
            break;
          default:
            result.push(lightning.createList(column.label, parseNulls(column.data)));
        }
      }
      return result;
    })();

    vectors.unshift(lightning.createVector('Row', TNumber, (__range__(frame.row_offset, frame.row_count, false).map((rowIndex) => rowIndex + 1))));

    return lightning.createDataFrame('data', vectors, (range(frame.row_count - frame.row_offset)), null, {
      description: 'A partial list of rows in the H2O Frame.',
      origin: `getFrameData ${stringify(frameKey)}`
    }
    );
  });

  const extendFrameData = function(frameKey, frame) {
    const inspections =
      {data: inspectFrameData(frameKey, frame)};

    const origin = `getFrameData ${stringify(frameKey)}`;
    inspect_(frame, inspections);
    return render_(frame, h2o.FrameDataOutput, frame);
  };

  const extendFrame = function(frameKey, frame) {
    const inspections = {
      columns: inspectFrameColumns('columns', frameKey, frame, frame.columns),
      data: inspectFrameData(frameKey, frame)
    };

    const enumColumns = (Array.from(frame.columns).filter((column) => column.type === 'enum'));
    if (enumColumns.length > 0) { inspections.factors = inspectFrameColumns('factors', frameKey, frame, enumColumns); }

    const origin = `getFrameSummary ${stringify(frameKey)}`;
    inspections[frame.chunk_summary.name] = inspectTwoDimTable_(origin, frame.chunk_summary.name, frame.chunk_summary);
    inspections[frame.distribution_summary.name] = inspectTwoDimTable_(origin, frame.distribution_summary.name, frame.distribution_summary);
    inspect_(frame, inspections);
    return render_(frame, h2o.FrameOutput, frame);
  };

  const extendFrameSummary = function(frameKey, frame) {
    const inspections =
      {columns: inspectFrameColumns('columns', frameKey, frame, frame.columns)};

    const enumColumns = (Array.from(frame.columns).filter((column) => column.type === 'enum'));
    if (enumColumns.length > 0) { inspections.factors = inspectFrameColumns('factors', frameKey, frame, enumColumns); }

    const origin = `getFrameSummary ${stringify(frameKey)}`;
    inspections[frame.chunk_summary.name] = inspectTwoDimTable_(origin, frame.chunk_summary.name, frame.chunk_summary);
    inspections[frame.distribution_summary.name] = inspectTwoDimTable_(origin, frame.distribution_summary.name, frame.distribution_summary);
    inspect_(frame, inspections);
    return render_(frame, h2o.FrameOutput, frame);
  };

  const extendColumnSummary = function(frameKey, frame, columnName) {
    const column = head(frame.columns);
    const rowCount = frame.rows;

    const inspectPercentiles = function() {
      const vectors = [
        lightning.createVector('percentile', TNumber, frame.default_percentiles),
        lightning.createVector('value', TNumber, column.percentiles)
      ];

      return lightning.createDataFrame('percentiles', vectors, (range(frame.default_percentiles.length)), null, {
        description: `Percentiles for column '${column.label}' in frame '${frameKey}'.`,
        origin: `getColumnSummary ${stringify(frameKey)}, ${stringify(columnName)}`
      }
      );
    };

    const inspectDistribution = function() {
      let binCount, count, countData, i, intervalData, widthData;
      let asc2, start;
      const minBinCount = 32;
      const { histogram_base:base, histogram_stride:stride, histogram_bins:bins } = column;
      const width = Math.ceil(bins.length / minBinCount);
      const interval = stride * width;

      const rows = [];
      if (width > 0) {
        let asc, end;
        binCount = minBinCount + ((bins.length % width) > 0 ? 1 : 0);
        intervalData = new Array(binCount);
        widthData = new Array(binCount);
        countData = new Array(binCount);
        for (i = 0, end = binCount, asc = 0 <= end; asc ? i < end : i > end; asc ? i++ : i--) {
          const m = i * width;
          const n = m + width;
          count = 0;
          for (let binIndex = m, end1 = n, asc1 = m <= end1; asc1 ? binIndex < end1 : binIndex > end1; asc1 ? binIndex++ : binIndex--) {
            if (binIndex < bins.length) {
              count += bins[binIndex];
            }
          }

          intervalData[i] = base + (i * interval);
          widthData[i] = interval;
          countData[i] = count;
        }
      } else {
        binCount = bins.length;
        intervalData = new Array(binCount);
        widthData = new Array(binCount);
        countData = new Array(binCount);
        for (i = 0; i < bins.length; i++) {
          count = bins[i];
          intervalData[i] = base + (i * stride);
          widthData[i] = stride;
          countData[i] = count;
        }
      }

      // Trim off empty bins from the end
      for (start = binCount - 1, i = start, asc2 = start <= 0; asc2 ? i <= 0 : i >= 0; asc2 ? i++ : i--) {
        if (countData[i] !== 0) {
          binCount = i + 1;
          intervalData = intervalData.slice(0, binCount);
          widthData = widthData.slice(0, binCount);
          countData = countData.slice(0, binCount);
          break;
        }
      }

      const vectors = [
        lightning.createFactor('interval', TString, intervalData),
        lightning.createVector('width', TNumber, widthData),
        lightning.createVector('count', TNumber, countData)
      ];

      return lightning.createDataFrame('distribution', vectors, (range(binCount)), null, {
        description: `Distribution for column '${column.label}' in frame '${frameKey}'.`,
        origin: `getColumnSummary ${stringify(frameKey)}, ${stringify(columnName)}`,
        plot: `plot inspect 'distribution', getColumnSummary ${stringify(frameKey)}, ${stringify(columnName)}`
      }
      );
    };

    const inspectCharacteristics = function() {
      const { missing_count, zero_count, positive_infinity_count, negative_infinity_count } = column;
      const other = rowCount - missing_count - zero_count - positive_infinity_count - negative_infinity_count;

      const characteristicData = [ 'Missing', '-Inf', 'Zero', '+Inf', 'Other' ];
      const countData = [ missing_count, negative_infinity_count, zero_count, positive_infinity_count, other ];
      const percentData = Array.from(countData).map((count) =>
        (100 * count) / rowCount);

      const vectors = [
        lightning.createFactor('characteristic', TString, characteristicData),
        lightning.createVector('count', TNumber, countData),
        lightning.createVector('percent', TNumber, percentData)
      ];

      return lightning.createDataFrame('characteristics', vectors, (range(characteristicData.length)), null, {
        description: `Characteristics for column '${column.label}' in frame '${frameKey}'.`,
        origin: `getColumnSummary ${stringify(frameKey)}, ${stringify(columnName)}`,
        plot: `plot inspect 'characteristics', getColumnSummary ${stringify(frameKey)}, ${stringify(columnName)}`
      }
      );
    };

    const inspectSummary = function() {
      const defaultPercentiles = frame.default_percentiles;
      const {
        percentiles
      } = column;

      const {
        mean
      } = column;
      const q1 = percentiles[defaultPercentiles.indexOf(0.25)];
      const q2 = percentiles[defaultPercentiles.indexOf(0.5)];
      const q3 = percentiles[defaultPercentiles.indexOf(0.75)];
      const outliers = uniq(concat(column.mins, column.maxs));
      const minimum = head(column.mins);
      const maximum = head(column.maxs);

      const vectors = [
        lightning.createFactor('column', TString, [ columnName ]),
        lightning.createVector('mean', TNumber, [ mean ]),
        lightning.createVector('q1', TNumber, [ q1 ]),
        lightning.createVector('q2', TNumber, [ q2 ]),
        lightning.createVector('q3', TNumber, [ q3 ]),
        lightning.createVector('min', TNumber, [ minimum ]),
        lightning.createVector('max', TNumber, [ maximum ])
      ];

      return lightning.createDataFrame('summary', vectors, (range(1)), null, {
        description: `Summary for column '${column.label}' in frame '${frameKey}'.`,
        origin: `getColumnSummary ${stringify(frameKey)}, ${stringify(columnName)}`,
        plot: `plot inspect 'summary', getColumnSummary ${stringify(frameKey)}, ${stringify(columnName)}`
      }
      );
    };

    const inspectDomain = function() {
      const levels = map(column.histogram_bins, (count, index) => ({
        count,
        index
      }));
      //TODO sort table in-place when sorting is implemented
      const sortedLevels = sortBy(levels, level => -level.count);

      const [ labels, counts, percents ] = Array.from(createArrays(3, sortedLevels.length));

      for (let i = 0; i < sortedLevels.length; i++) {
        const level = sortedLevels[i];
        labels[i] = column.domain[level.index];
        counts[i] = level.count;
        percents[i] = (100 * level.count) / rowCount;
      }

      const vectors = [
        lightning.createFactor('label', TString, labels),
        lightning.createVector('count', TNumber, counts),
        lightning.createVector('percent', TNumber, percents)
      ];

      return lightning.createDataFrame('domain', vectors, (range(sortedLevels.length)), null, {
        description: `Domain for column '${column.label}' in frame '${frameKey}'.`,
        origin: `getColumnSummary ${stringify(frameKey)}, ${stringify(columnName)}`,
        plot: `plot inspect 'domain', getColumnSummary ${stringify(frameKey)}, ${stringify(columnName)}`
      }
      );
    };

    const inspections =
      {characteristics: inspectCharacteristics};

    switch (column.type) {
      case 'int': case 'real':
        // Skip for columns with all NAs
        if (column.histogram_bins.length) {
          inspections.distribution = inspectDistribution;
        }
        // Skip for columns with all NAs
        if (!some(column.percentiles, a => a === 'NaN')) {
          inspections.summary = inspectSummary;
          inspections.percentiles = inspectPercentiles;
        }
        break;
      case 'enum':
        inspections.domain = inspectDomain;
        break;
    }

    inspect_(frame, inspections);
    return render_(frame, h2o.ColumnSummaryOutput, frameKey, frame, columnName);
  };

  const requestFrame = (frameKey, go) => _.requestFrameSlice(frameKey, undefined, 0, 20, function(error, frame) {
    if (error) {
      return go(error);
    } else {
      return go(null, extendFrame(frameKey, frame));
    }
  });

  const requestFrameData = (frameKey, searchTerm, offset, count, go) => _.requestFrameSlice(frameKey, searchTerm, offset, count, function(error, frame) {
    if (error) {
      return go(error);
    } else {
      return go(null, extendFrameData(frameKey, frame));
    }
  });

  const requestFrameSummarySlice = (frameKey, searchTerm, offset, length, go) => _.requestFrameSummarySlice(frameKey, searchTerm, offset, length, function(error, frame) {
    if (error) {
      return go(error);
    } else {
      return go(null, extendFrameSummary(frameKey, frame));
    }
  });

  const requestFrameSummary = (frameKey, go) => _.requestFrameSummarySlice(frameKey, undefined, 0, 20, function(error, frame) {
    if (error) {
      return go(error);
    } else {
      return go(null, extendFrameSummary(frameKey, frame));
    }
  });


  const requestColumnSummary = (frameKey, columnName, go) => _.requestColumnSummary(frameKey, columnName, function(error, frame) {
    if (error) {
      return go(error);
    } else {
      return go(null, extendColumnSummary(frameKey, frame, columnName));
    }
  });

  const requestFrames = go => _.requestFrames(function(error, frames) {
    if (error) {
      return go(error);
    } else {
      return go(null, extendFrames(frames));
    }
  });

  const requestCreateFrame = (opts, go) => _.requestCreateFrame(opts, function(error, result) {
    if (error) {
      return go(error);
    } else {
      return _.requestJob(result.key.name, function(error, job) {
        if (error) {
          return go(error);
        } else {
          return go(null, extendJob(job));
        }
      });
    }
  });

  const requestPartialDependence = (opts, go) => _.requestPartialDependence(opts, function(error, result) {
    if (error) {
      return go(error);
    } else {
      return _.requestJob(result.key.name, function(error, job) {
        if (error) {
          return go(error);
        } else {
          return go(null, extendJob(job));
        }
      });
    }
  });

  const requestPartialDependenceData = (key, go) => _.requestPartialDependenceData(key, function(error, result) {
    if (error) {
      return go(error);
    } else {
      return go(null, extendPartialDependence(result));
    }
  });

  const computeSplits = function(ratios, keys) {
    let key, ratio;
    const parts = [];
    let sum = 0;

    const iterable = keys.slice(0, ratios.length);
    for (let i = 0; i < iterable.length; i++) {
      key = iterable[i];
      sum += (ratio = ratios[i]);
      parts.push({
        key,
        ratio
      });
    }

    parts.push({
      key: keys[keys.length - 1],
      ratio: 1 - sum
    });

    const splits = [];
    sum = 0;
    for (let part of Array.from(parts)) {
      splits.push({
        min: sum,
        max: sum + part.ratio,
        key: part.key
      });

      sum += part.ratio;
    }

    return splits;
  };

  const requestBindFrames = (key, sourceKeys, go) => _.requestExec(`(assign ${key} (cbind ${sourceKeys.join(' ')}))`, function(error, result) {
    if (error) {
      return go(error);
    } else {
      return go(null, extendBindFrames(key, result));
    }
  });

  const requestSplitFrame = function(frameKey, splitRatios, splitKeys, seed, go) {
    if (splitRatios.length === (splitKeys.length - 1)) {
      const splits = computeSplits(splitRatios, splitKeys);

      const randomVecKey = lightning.createTempKey();

      const statements = [];

      statements.push(`(tmp= ${randomVecKey} (h2o.runif ${frameKey} ${seed}))`);

      for (let i = 0; i < splits.length; i++) {
        const part = splits[i];
        const g = i !== 0 ? `(> ${randomVecKey} ${part.min})` : null;

        const l = i !== (splits.length - 1) ? `(<= ${randomVecKey} ${part.max})` : null;

        const sliceExpr = g && l ?
          `(& ${g} ${l})`
        : l ?
          l
        :
          g;

        statements.push(`(assign ${part.key} (rows ${frameKey} ${sliceExpr}))`);
      }

      statements.push(`(rm ${randomVecKey})`);

      return _.requestExec(`(, ${statements.join(' ')})`, function(error, result) {
        if (error) {
          return go(error);
        } else {
          return go(null, extendSplitFrameResult({
            keys: splitKeys,
            ratios: splitRatios
          })
          );
        }
      });

    } else {
      return go(new FlowError('The number of split ratios should be one less than the number of split keys'));
    }
  };

  const requestMergeFrames = function(destinationKey, leftFrameKey, leftColumnIndex, includeAllLeftRows, rightFrameKey, rightColumnIndex, includeAllRightRows, go) {
    const lr = includeAllLeftRows ? 'TRUE' : 'FALSE';
    const rr = includeAllRightRows ? 'TRUE' : 'FALSE';
    const statement = `(assign ${destinationKey} (merge ${leftFrameKey} ${rightFrameKey} ${lr} ${rr} ${leftColumnIndex} ${rightColumnIndex} \"radix\"))`;
    return _.requestExec(statement, function(error, result) {
      if (error) {
        return go(error);
      } else {
        return go(null, extendMergeFramesResult({
          key: destinationKey})
        );
      }
    });
  };

  var createFrame = function(opts) {
    if (opts) {
      return _fork(requestCreateFrame, opts);
    } else {
      return assist(createFrame);
    }
  };

  var splitFrame = function(frameKey, splitRatios, splitKeys, seed) {
    if (seed == null) { seed = -1; }
    if (frameKey && splitRatios && splitKeys) {
      return _fork(requestSplitFrame, frameKey, splitRatios, splitKeys, seed);
    } else {
      return assist(splitFrame);
    }
  };

  var mergeFrames = function(destinationKey, leftFrameKey, leftColumnIndex, includeAllLeftRows, rightFrameKey, rightColumnIndex, includeAllRightRows) {
    if (destinationKey && leftFrameKey && rightFrameKey) {
      return _fork(requestMergeFrames, destinationKey, leftFrameKey, leftColumnIndex, includeAllLeftRows, rightFrameKey, rightColumnIndex, includeAllRightRows);
    } else {
      return assist(mergeFrames);
    }
  };

  // define the function that is called when
  // the Partial Dependence plot input form
  // is submitted
  var buildPartialDependence = function(opts) {
    if (opts) {
      return _fork(requestPartialDependence, opts);
    } else {
      // specify function to call if user
      // provides malformed input
      return assist(buildPartialDependence);
    }
  };

  var getPartialDependence = function(destinationKey) {
    if (destinationKey) {
      return _fork(requestPartialDependenceData, destinationKey);
    } else {
      return assist(getPartialDependence);
    }
  };

  const getFrames = () => _fork(requestFrames);

  var getFrame = function(frameKey) {
    switch (typeOf(frameKey)) {
      case 'String':
        return _fork(requestFrame, frameKey);
      default:
        return assist(getFrame);
    }
  };

  const bindFrames = (key, sourceKeys) => _fork(requestBindFrames, key, sourceKeys);

  var getFrameSummary = function(frameKey) {
    switch (typeOf(frameKey)) {
      case 'String':
        return _fork(requestFrameSummary, frameKey);
      default:
        return assist(getFrameSummary);
    }
  };

  const getFrameData = function(frameKey) {
    switch (typeOf(frameKey)) {
      case 'String':
        return _fork(requestFrameData, frameKey, undefined, 0, 20);
      default:
        return assist(getFrameSummary);
    }
  };

  const requestDeleteFrame = (frameKey, go) => _.requestDeleteFrame(frameKey, function(error, result) {
    if (error) { return go(error); } else { return go(null, extendDeletedKeys([ frameKey ])); }
});

  var deleteFrame = function(frameKey) {
    if (frameKey) {
      return _fork(requestDeleteFrame, frameKey);
    } else {
      return assist(deleteFrame);
    }
  };

  const extendExportFrame = result => render_(result, h2o.ExportFrameOutput, result);

  var extendBindFrames = (key, result) => render_(result, h2o.BindFramesOutput, key, result);

  const requestExportFrame = (frameKey, path, opts, go) => _.requestExportFrame(frameKey, path, (opts.overwrite ? true : false), function(error, result) {
    if (error) {
      return go(error);
    } else {
      return _.requestJob(result.job.key.name, function(error, job) {
        if (error) {
          return go(error);
        } else {
          return go(null, extendJob(job));
        }
      });
    }
  });

  var exportFrame = function(frameKey, path, opts) {
    if (opts == null) { opts = {}; }
    if (frameKey && path) {
      return _fork(requestExportFrame, frameKey, path, opts);
    } else {
      return assist(exportFrame, frameKey, path, opts);
    }
  };

  const requestDeleteFrames = function(frameKeys, go) {
    const futures = map(frameKeys, frameKey => _fork(_.requestDeleteFrame, frameKey));
    return async.join(futures, function(error, results) {
      if (error) {
        return go(error);
      } else {
        return go(null, extendDeletedKeys(frameKeys));
      }
    });
  };

  var deleteFrames = function(frameKeys) {
    switch (frameKeys.length) {
      case 0:
        return assist(deleteFrames);
      case 1:
        return deleteFrame(head(frameKeys));
      default:
        return _fork(requestDeleteFrames, frameKeys);
    }
  };

  const getColumnSummary = (frameKey, columnName) => _fork(requestColumnSummary, frameKey, columnName);

  const requestModels = go => _.requestModels(function(error, models) {
    if (error) { return go(error); } else { return go(null, extendModels(models)); }
  });

  const requestModelsByKeys = function(modelKeys, go) {
    const futures = map(modelKeys, key => _fork(_.requestModel, key));
    return async.join(futures, function(error, models) {
      if (error) { return go(error); } else { return go(null, extendModels(models)); }
    });
  };

  const getModels = function(modelKeys) {
    if (isArray(modelKeys)) {
      if (modelKeys.length) {
        return _fork(requestModelsByKeys, modelKeys);
      } else {
        return _fork(requestModels);
      }
    } else {
      return _fork(requestModels);
    }
  };

  const requestGrids = go => _.requestGrids(function(error, grids) {
    if (error) { return go(error); } else { return go(null, extendGrids(grids)); }
  });

  const getGrids = () => _fork(requestGrids);

  const requestLeaderboard = (key, go) => _.requestLeaderboard(key, function(error, leaderboard) {
    if (error) { return go(error); } else { return go(null, extendLeaderboard(leaderboard)); }
  });

  const getLeaderboard = key => _fork(requestLeaderboard, key);

  const requestModel = (modelKey, go) => _.requestModel(modelKey, function(error, model) {
    if (error) { return go(error); } else { return go(null, extendModel(model)); }
  });

  var getModel = function(modelKey) {
    switch (typeOf(modelKey)) {
      case 'String':
        return _fork(requestModel, modelKey);
      default:
        return assist(getModel);
    }
  };

  const requestGrid = (gridKey, opts, go) => _.requestGrid(gridKey, opts, function(error, grid) {
    if (error) { return go(error); } else { return go(null, extendGrid(grid, opts)); }
  });

  var getGrid = function(gridKey, opts) {
    switch (typeOf(gridKey)) {
      case 'String':
        return _fork(requestGrid, gridKey, opts);
      default:
        return assist(getGrid);
    }
  };

  const findColumnIndexByColumnLabel = function(frame, columnLabel) {
    for (let i = 0; i < frame.columns.length; i++) {
      const column = frame.columns[i];
      if (column.label === columnLabel) {
        return i;
      }
    }
    throw new FlowError(`Column [${columnLabel}] not found in frame`);
  };

  const findColumnIndicesByColumnLabels = (frame, columnLabels) => Array.from(columnLabels).map((columnLabel) =>
    findColumnIndexByColumnLabel(frame, columnLabel));


  const requestImputeColumn = function(opts, go) {
    let { frame, column, method, combineMethod, groupByColumns } = opts;
    combineMethod = combineMethod != null ? combineMethod : 'interpolate';
    return _.requestFrameSummaryWithoutData(frame, function(error, result) {
      if (error) {
        return go(error);
      } else {
        let columnIndex, groupByColumnIndices;
        try {
          columnIndex = findColumnIndexByColumnLabel(result, column);
        } catch (columnKeyError) {
          return go(columnKeyError);
        }

        if (groupByColumns && groupByColumns.length) {
          try {
            groupByColumnIndices = findColumnIndicesByColumnLabels(result, groupByColumns);
          } catch (columnIndicesError) {
            return go(columnIndicesError);
          }
        } else {
          groupByColumnIndices = null;
        }

        const groupByArg = groupByColumnIndices ?
          `[${groupByColumnIndices.join(' ')}]`
        :
          "[]";

        return _.requestExec(`(h2o.impute ${frame} ${columnIndex} ${JSON.stringify(method)} ${JSON.stringify(combineMethod)} ${groupByArg} _ _)`, function(error, result) {
          if (error) {
            return go(error);
          } else {
            return requestColumnSummary(frame, column, go);
          }
        });
      }
    });
  };

  const requestChangeColumnType = function(opts, go) {
    const { frame, column, type } = opts;

    const method = type === 'enum' ? 'as.factor' : 'as.numeric';

    return _.requestFrameSummaryWithoutData(frame, function(error, result) {
        let columnIndex;
        try {
          columnIndex = findColumnIndexByColumnLabel(result, column);
        } catch (columnKeyError) {
          return go(columnKeyError);
        }

        return _.requestExec(`(assign ${frame} (:= ${frame} (${method} (cols ${frame} ${columnIndex})) ${columnIndex} [0:${result.rows}]))`, function(error, result) {
          if (error) {
            return go(error);
          } else {
            return requestColumnSummary(frame, column, go);
          }
        });
    });
  };

  var imputeColumn = function(opts) {
    if (opts && opts.frame && opts.column && opts.method) {
      return _fork(requestImputeColumn, opts);
    } else {
      return assist(imputeColumn, opts);
    }
  };

  var changeColumnType = function(opts) {
    if (opts && opts.frame && opts.column && opts.type) {
      return _fork(requestChangeColumnType, opts);
    } else {
      return assist(changeColumnType, opts);
    }
  };

  const requestDeleteModel = (modelKey, go) => _.requestDeleteModel(modelKey, function(error, result) {
    if (error) { return go(error); } else { return go(null, extendDeletedKeys([ modelKey ])); }
});

  var deleteModel = function(modelKey) {
    if (modelKey) {
      return _fork(requestDeleteModel, modelKey);
    } else {
      return assist(deleteModel);
    }
  };

  const extendImportModel = result => render_(result, h2o.ImportModelOutput, result);

  const requestImportModel = (path, opts, go) => _.requestImportModel(path, (opts.overwrite ? true : false), function(error, result) {
    if (error) { return go(error); } else { return go(null, extendImportModel(result)); }
  });

  var importModel = function(path, opts) {
    if (path && path.length) {
      return _fork(requestImportModel, path, opts);
    } else {
      return assist(importModel, path, opts);
    }
  };

  const extendExportModel = result => render_(result, h2o.ExportModelOutput, result);

  const requestExportModel = (modelKey, path, opts, go) => _.requestExportModel(opts.format, modelKey, path, (opts.overwrite ? true : false), function(error, result) {
    if (error) { return go(error); } else { return go(null, extendExportModel(result)); }
  });

  var exportModel = function(modelKey, path, opts) {
    if (modelKey && path) {
      return _fork(requestExportModel, modelKey, path, opts);
    } else {
      return assist(exportModel, modelKey, path, opts);
    }
  };

  const requestDeleteModels = function(modelKeys, go) {
    const futures = map(modelKeys, modelKey => _fork(_.requestDeleteModel, modelKey));
    return async.join(futures, function(error, results) {
      if (error) {
        return go(error);
      } else {
        return go(null, extendDeletedKeys(modelKeys));
      }
    });
  };

  var deleteModels = function(modelKeys) {
    switch (modelKeys.length) {
      case 0:
        return assist(deleteModels);
      case 1:
        return deleteModel(head(modelKeys));
      default:
        return _fork(requestDeleteModels, modelKeys);
    }
  };

  const requestJob = (key, go) => _.requestJob(key, function(error, job) {
    if (error) {
      return go(error);
    } else {
      return go(null, extendJob(job));
    }
  });

  const requestJobs = go => _.requestJobs(function(error, jobs) {
    if (error) {
      return go(error);
    } else {
      return go(null, extendJobs(jobs));
    }
  });

  const getJobs = () => _fork(requestJobs);

  var getJob = function(arg) {
    switch (typeOf(arg)) {
      case 'String':
        return _fork(requestJob, arg);
      case 'Object':
        if (arg.key != null) {
          return getJob(arg.key);
        } else {
          return assist(getJob);
        }
      default:
        return assist(getJob);
    }
  };

  const requestCancelJob = (key, go) => _.requestCancelJob(key, function(error) {
    if (error) {
      return go(error);
    } else {
      return go(null, extendCancelJob({}));
    }
});

  var cancelJob = function(arg) {
    switch (typeOf(arg)) {
      case 'String':
        return _fork(requestCancelJob, arg);
      default:
        return assist(cancelJob);
    }
  };

  const extendImportResults = importResults => render_(importResults, h2o.ImportFilesOutput, importResults);

  const requestImportFiles = (paths, go) => _.requestImportFiles(paths, function(error, importResults) {
    if (error) {
      return go(error);
    } else {
      return go(null, extendImportResults(importResults));
    }
  });

  var importFiles = function(paths) {
    switch (typeOf(paths)) {
      case 'Array':
        return _fork(requestImportFiles, paths);
      default:
        return assist(importFiles);
    }
  };

  const extendImportSqlResults = importResults => render_(importResults, h2o.ImportSqlTableOutput, importResults);

  const requestImportSqlTable = (arg, go) => _.requestImportSqlTable(arg, function(error, importResults) {
    if (error) {
      return go(error);
    } else {
      return go(null, extendImportSqlResults(importResults));
    }
  });

  var importSqlTable = function(arg) {
    switch (typeOf(arg)) {
      case 'Object':
        return _fork(requestImportSqlTable, arg);
      default:
        return assist(importSqlTable);
    }
  };

  var importBqTable = () => assist(importBqTable);

  const extendParseSetupResults = (args, parseSetupResults) => render_(parseSetupResults, h2o.SetupParseOutput, args, parseSetupResults);

  const requestImportAndParseSetup = (paths, go) => _.requestImportFiles(paths, function(error, importResults) {
    if (error) {
      return go(error);
    } else {
      const sourceKeys = flatten(compact(map(importResults, result => result.destination_frames)));
      return _.requestParseSetup(sourceKeys, function(error, parseSetupResults) {
        if (error) {
          return go(error);
        } else {
          return go(null, extendParseSetupResults({ paths }, parseSetupResults));
        }
      });
    }
  });

  const requestParseSetup = (sourceKeys, go) => _.requestParseSetup(sourceKeys, function(error, parseSetupResults) {
    if (error) {
      return go(error);
    } else {
      return go(null, extendParseSetupResults({ source_frames: sourceKeys }, parseSetupResults));
    }
  });

  var setupParse = function(args) {
    if (args.paths && isArray(args.paths)) {
      return _fork(requestImportAndParseSetup, args.paths);
    } else if (args.source_frames && isArray(args.source_frames)) {
      return _fork(requestParseSetup, args.source_frames);
    } else {
      return assist(setupParse);
    }
  };

  const extendParseResult = parseResult => render_(parseResult, h2o.JobOutput, parseResult.job);

  const requestImportAndParseFiles = (
    paths,
    destinationKey,
    parseType,
    separator,
    columnCount,
    useSingleQuotes,
    columnNames,
    columnTypes,
    deleteOnDone,
    checkHeader,
    chunkSize,
    escapechar,
    go
  ) => _.requestImportFiles(paths, function(error, importResults) {
    if (error) {
      return go(error);
    } else {
      const sourceKeys = flatten(compact(map(importResults, result => result.destination_frames)));
      return _.requestParseFiles(sourceKeys, destinationKey, parseType, separator, columnCount, useSingleQuotes, columnNames, columnTypes, deleteOnDone, checkHeader, chunkSize, escapechar, function(error, parseResult) {
        if (error) {
          return go(error);
        } else {
          return go(null, extendParseResult(parseResult));
        }
      });
    }
  });

  const requestParseFiles = (
    sourceKeys,
    destinationKey,
    parseType,
    separator,
    columnCount,
    useSingleQuotes,
    columnNames,
    columnTypes,
    deleteOnDone,
    checkHeader,
    chunkSize,
    escapechar,
    go
  ) => _.requestParseFiles(sourceKeys, destinationKey, parseType, separator, columnCount, useSingleQuotes, columnNames, columnTypes, deleteOnDone, checkHeader, chunkSize, escapechar, function(error, parseResult) {
    if (error) {
      return go(error);
    } else {
      return go(null, extendParseResult(parseResult));
    }
  });

  const parseFiles = function(opts) { //XXX review args
    //XXX validation
    const destinationKey = opts.destination_frame;
    const parseType = opts.parse_type;
    const {
      separator
    } = opts;
    const columnCount = opts.number_columns;
    const useSingleQuotes = opts.single_quotes;
    const columnNames = opts.column_names;
    const columnTypes = opts.column_types;
    const deleteOnDone = opts.delete_on_done;
    const checkHeader = opts.check_header;
    const chunkSize = opts.chunk_size;
    const {
      escapechar
    } = opts;

    if (opts.paths) {
      return _fork(requestImportAndParseFiles, opts.paths, destinationKey, parseType, separator, columnCount, useSingleQuotes, columnNames, columnTypes, deleteOnDone, checkHeader, chunkSize, escapechar);
    } else {
      return _fork(requestParseFiles, opts.source_frames, destinationKey, parseType, separator, columnCount, useSingleQuotes, columnNames, columnTypes, deleteOnDone, checkHeader, chunkSize, escapechar);
    }
  };

  const requestModelBuild = (algo, opts, go) => _.requestModelBuild(algo, opts, function(error, result) {
    if (error) {
      return go(error);
    } else {
      if (result.error_count > 0) {
        const messages = (Array.from(result.messages).map((validation) => validation.message));
        return go(new FlowError(`Model build failure: ${messages.join('; ')}`));
      } else {
        return go(null, extendJob(result.job));
      }
    }
  });

  const requestAutoMLBuild = (opts, go) => _.requestAutoMLBuild(opts, function(error, result) {
    if (error) {
      return go(error);
    } else {
      return go(null, extendJob(result.job));
    }
  });

  var runAutoML = function(opts, action) {
    if (action === 'exec') {
      return _fork(requestAutoMLBuild, opts);
    } else {
      return assist(runAutoML, opts);
    }
  };

  var buildModel = function(algo, opts) {
    if (algo && opts && (keys(opts).length > 1)) {
      return _fork(requestModelBuild, algo, opts);
    } else {
      return assist(buildModel, algo, opts);
    }
  };

  const unwrapPrediction = go => (function(error, result) {
    if (error) {
      return go(error);
    } else {
      return go(null, extendPrediction(result));
    }
  });

  const requestPredict = (destinationKey, modelKey, frameKey, options, go) => _.requestPredict(destinationKey, modelKey, frameKey, options, unwrapPrediction(go));

  const requestPredicts = function(opts, go) {
    const futures = map(opts, function(opt) {
      const { model: modelKey, frame: frameKey, options } = opt;
      return _fork(_.requestPredict, null, modelKey, frameKey, options || {});
  });

    return async.join(futures, function(error, predictions) {
      if (error) {
        return go(error);
      } else {
        return go(null, extendPredictions(opts, predictions));
      }
    });
  };

  var predict = function(opts) {
    if (opts == null) { opts = {}; }
    let { predictions_frame, model, models, frame, frames, reconstruction_error, deep_features_hidden_layer, leaf_node_assignment, exemplar_index } = opts;
    if (models || frames) {
      if (!models) {
        if (model) {
          models = [ model ];
        }
      }
      if (!frames) {
        if (frame) {
          frames = [ frame ];
        }
      }

      if (frames && models) {
        const combos = [];
        for (model of Array.from(models)) {
          for (frame of Array.from(frames)) {
            combos.push({model, frame});
          }
        }

        return _fork(requestPredicts, combos);
      } else {
        return assist(predict, {predictions_frame, models, frames});
      }
    } else {
      if (model && frame) {
        return _fork(requestPredict, predictions_frame, model, frame, {
          reconstruction_error,
          deep_features_hidden_layer,
          leaf_node_assignment
        }
        );
      } else if (model && (exemplar_index !== undefined)) {
        return _fork(requestPredict, predictions_frame, model, null,
          {exemplar_index});
      } else {
        return assist(predict, {predictions_frame, model, frame});
      }
    }
  };

  const requestPrediction = (modelKey, frameKey, go) => _.requestPrediction(modelKey, frameKey, unwrapPrediction(go));

  const requestPredictions = function(opts, go) {
    if (isArray(opts)) {
      const futures = map(opts, function(opt) {
        const { model: modelKey, frame: frameKey } = opt;
        return _fork(_.requestPredictions, modelKey, frameKey);
      });
      return async.join(futures, function(error, predictions) {
        if (error) {
          return go(error);
        } else {
          // De-dupe predictions
          const uniquePredictions = values(keyBy((flatten(predictions, true)), prediction => prediction.model.name + prediction.frame.name));
          return go(null, extendPredictions(opts, uniquePredictions));
        }
      });
    } else {
      const { model: modelKey, frame: frameKey } = opts;
      return _.requestPredictions(modelKey, frameKey, function(error, predictions) {
        if (error) {
          return go(error);
        } else {
          return go(null, extendPredictions(opts, predictions));
        }
      });
    }
  };

  var getPrediction = function(opts) {
    if (opts == null) { opts = {}; }
    const { predictions_frame, model, frame } = opts;
    if (model && frame) {
      return _fork(requestPrediction, model, frame);
    } else {
      return assist(getPrediction, {predictions_frame, model, frame});
    }
  };

  const getPredictions = function(opts) {
    if (opts == null) { opts = {}; }
    return _fork(requestPredictions, opts);
  };

  const requestCloud = go => _.requestCloud(function(error, cloud) {
    if (error) {
      return go(error);
    } else {
      return go(null, extendCloud(cloud));
    }
  });

  const getCloud = () => _fork(requestCloud);

  const requestTimeline = go => _.requestTimeline(function(error, timeline) {
    if (error) {
      return go(error);
    } else {
      return go(null, extendTimeline(timeline));
    }
  });

  const getTimeline = () => _fork(requestTimeline);

  const requestStackTrace = go => _.requestStackTrace(function(error, stackTrace) {
    if (error) {
      return go(error);
    } else {
      return go(null, extendStackTrace(stackTrace));
    }
  });

  const getStackTrace = () => _fork(requestStackTrace);

  const requestLogFile = (nodeIpPort, fileType, go) => _.requestCloud(function(error, cloud) {
    if (error) {
      return go(error);
    } else {
      return _.requestLogFile(nodeIpPort, fileType, function(error, logFile) {
        if (error) {
          return go(error);
        } else {
          return go(null, extendLogFile(cloud, nodeIpPort, fileType, logFile));
        }
      });
    }
  });

  const getLogFile = function(nodeIpPort, fileType) {
    if (nodeIpPort == null) { nodeIpPort = "self"; }
    if (fileType == null) { fileType = 'info'; }
    return _fork(requestLogFile, nodeIpPort, fileType);
  };

  const requestNetworkTest = go => _.requestNetworkTest(function(error, result) {
    if (error) {
      return go(error);
    } else {
      return go(null, extendNetworkTest(result));
    }
  });

  const testNetwork = () => _fork(requestNetworkTest);

  const requestRemoveAll = go => _.requestRemoveAll(function(error, result) {
    if (error) {
      return go(error);
    } else {
      return go(null, extendDeletedKeys([]));
    }});

  const deleteAll = () => _fork(requestRemoveAll);

  const extendRDDs = function(rdds) {
    render_(rdds, h2o.RDDsOutput, rdds);
    return rdds;
  };

  const requestRDDs = go => _.requestRDDs(function(error, result) {
    if (error) {
      return go(error);
    } else {
      return go(null, extendRDDs(result.rdds));
    }
  });

  const getRDDs = () => _fork(requestRDDs);

  const extendDataFrames = function(dataframes) {
    render_(dataframes, h2o.DataFramesOutput, dataframes);
    return dataframes;
  };

  const requestDataFrames = go => _.requestDataFrames(function(error, result) {
    if (error) {
      return go(error);
    } else {
      return go(null, extendDataFrames(result.dataframes));
    }
  });

  const getDataFrames = () => _fork(requestDataFrames);

  const extendAsH2OFrame = function(result) {
    render_(result, h2o.H2OFrameOutput, result);
    return result;
  };

  const requestAsH2OFrameFromRDD = (rdd_id, name, go) => _.requestAsH2OFrameFromRDD(rdd_id,name, function(error, h2oframe_id) {
    if (error) {
      return go(error);
    } else {
      return go(null, extendAsH2OFrame(h2oframe_id));
    }
  });

  const asH2OFrameFromRDD = function(rdd_id, name) {
    if (name == null) { name = undefined; }
    return _fork(requestAsH2OFrameFromRDD, rdd_id, name);
  };

  const requestAsH2OFrameFromDF = (df_id, name, go) => _.requestAsH2OFrameFromDF(df_id, name, function(error, result) {
    if (error) {
      return go(error);
    } else {
      return go(null, extendAsH2OFrame(result));
    }
  });

  const asH2OFrameFromDF = function(df_id, name) {
    if (name == null) { name = undefined; }
    return _fork(requestAsH2OFrameFromDF, df_id, name);
  };


  const extendAsDataFrame = function(result) {
    render_(result, h2o.DataFrameOutput, result);
    return result;
  };

  const requestAsDataFrame = (hf_id, name, go) => _.requestAsDataFrame(hf_id, name, function(error, result) {
    if (error) {
      return go(error);
    } else {
      return go(null, extendAsDataFrame(result));
    }
  });

  const asDataFrame = function(hf_id, name) {
    if (name == null) { name = undefined; }
    return _fork(requestAsDataFrame, hf_id, name);
  };

  var getScalaCodeExecutionResult = function(key) {
    switch (typeOf(key)) {
      case 'String':
        return _fork(requestScalaCodeExecutionResult, key);
      default:
        return assist(getScalaCodeExecutionResult);
    }
  };

  var requestScalaCodeExecutionResult = (key, go) => _.requestScalaCodeExecutionResult(key, function(error, result) {
    if (error) {
      return go(error);
    } else {
      return go(null, extendScalaSyncCode(result));
    }
  });

  const requestScalaCode = (session_id, async, code, go) => _.requestScalaCode(session_id, code,  function(error, result) {
    if (error) {
      return go(error);
    } else {
      if (async) {
          return go(null, extendScalaAsyncCode(result));
      } else {
          return go(null, extendScalaSyncCode(result));
        }
    }
  });


  var extendScalaSyncCode = function(result) {
    render_(result, h2o.ScalaCodeOutput, result);
    return result;
  };

  var extendScalaAsyncCode = function(result) {
    render_(result, h2o.JobOutput, result.job);
    return result;
  };

  const runScalaCode = (session_id, async, code) => _fork(requestScalaCode, session_id, async, code);

  const requestScalaIntp = go => _.requestScalaIntp(function(error, result) {
    if (error) {
      return go(error);
    } else {
      return go(null, extendScalaIntp(result));
    }
  });

  var extendScalaIntp = function(result) {
    render_(result, h2o.ScalaIntpOutput, result);
    return result;
  };

  const getScalaIntp = () => _fork(requestScalaIntp);

  const requestProfile = (depth, go) => _.requestProfile(depth, function(error, profile) {
    if (error) {
      return go(error);
    } else {
      return go(null, extendProfile(profile));
    }
  });

  const getProfile = function(opts) {
    if (!opts) { opts = {depth: 10}; }
    return _fork(requestProfile, opts.depth);
  };

  const loadScript = function(path, go) {
    const onDone = (script, status) => go(null, {script, status});
    const onFail = (jqxhr, settings, error) => go(error); //TODO use framework error
    return $.getScript(path)
      .done(onDone)
      .fail(onFail);
  };

  const dumpFuture = function(result, go) {
    if (result == null) { result = {}; }
    console.debug(result);
    return go(null, render_(result, objectBrowser, 'dump', result));
  };

  const dump = function(f) {
    if ((f != null ? f.isFuture : undefined)) {
      return _fork(dumpFuture, f);
    } else {
      return async.async(() => f);
    }
  };

  var assist = function(func, ...args) {
    if (func === undefined) {
      return _fork(proceed, h2o.Assist, [ _assistance ]);
    } else {
      switch (func) {
        case importFiles:
          return _fork(proceed, h2o.ImportFilesInput, []);
        case importSqlTable:
          return _fork(proceed, h2o.ImportSqlTableInput, args);
        case importBqTable:
          return _fork(proceed, h2o.ImportBqTableInput, args);
        case buildModel:
          return _fork(proceed, h2o.ModelInput, args);
        case runAutoML:
          return _fork(proceed, h2o.AutoMLInput, args);
        case predict: case getPrediction:
          return _fork(proceed, h2o.PredictInput, args);
        case createFrame:
          return _fork(proceed, h2o.CreateFrameInput, args);
        case splitFrame:
          return _fork(proceed, h2o.SplitFrameInput, args);
        case mergeFrames:
          return _fork(proceed, h2o.MergeFramesInput, args);
        case buildPartialDependence:
          return _fork(proceed, h2o.PartialDependenceInput, args);
        case exportFrame:
          return _fork(proceed, h2o.ExportFrameInput, args);
        case imputeColumn:
          return _fork(proceed, h2o.ImputeInput, args);
        case importModel:
          return _fork(proceed, h2o.ImportModelInput, args);
        case exportModel:
          return _fork(proceed, h2o.ExportModelInput, args);
        default:
          return _fork(proceed, h2o.NoAssist, []);
      }
    }
  };

  link(_.ready, function() {
    link(_.ls, ls);
    link(_.inspect, inspect);
    link(_.plot, p => p(lightning));
    link(_.plotlyPlot, p => p(Plotly));
    link(_.grid, frame => lightning(
      lightning.select(),
      lightning.from(frame)
    ));
    link(_.enumerate, frame => lightning(
      lightning.select(0),
      lightning.from(frame)
    ));
    link(_.requestFrameDataE, requestFrameData);
    return link(_.requestFrameSummarySliceE, requestFrameSummarySlice);
  });

  const initAssistanceSparklingWater = function() {
    _assistance.getRDDs = {
      description: 'Get a list of Spark\'s RDDs',
      icon: 'table'
    };
    return _assistance.getDataFrames = {
      description: 'Get a list of Spark\'s data frames',
      icon: 'table'
    };
  };

  link(_.initialized, function() {
    if (_.onSparklingWater) {
            return initAssistanceSparklingWater();
          }
  });

  const routines = {
    // fork/join
    fork: _fork,
    join: _join,
    call: _call,
    apply: _apply,
    isFuture: _isFuture,
    //
    // Dataflow
    signal,
    signals,
    isSignal,
    act,
    react,
    lift,
    merge,
    //
    // Generic
    dump,
    inspect,
    plot,
    plotlyPlot,
    grid,
    get: _get,
    //
    // Meta
    assist,
    //
    // GUI
    gui,
    //
    // Util
    loadScript,
    //
    // H2O
    getJobs,
    getJob,
    cancelJob,
    importFiles,
    importSqlTable,
    importBqTable,
    setupParse,
    parseFiles,
    createFrame,
    splitFrame,
    mergeFrames,
    buildPartialDependence,
    getPartialDependence,
    getFrames,
    getFrame,
    bindFrames,
    getFrameSummary,
    getFrameData,
    deleteFrames,
    deleteFrame,
    exportFrame,
    getColumnSummary,
    changeColumnType,
    imputeColumn,
    buildModel,
    runAutoML,
    getGrids,
    getLeaderboard,
    getModels,
    getModel,
    getGrid,
    deleteModels,
    deleteModel,
    importModel,
    exportModel,
    predict,
    getPrediction,
    getPredictions,
    getCloud,
    getTimeline,
    getProfile,
    getStackTrace,
    getLogFile,
    testNetwork,
    deleteAll
  };

  if (_.onSparklingWater) {
    const routinesOnSw = {
      getDataFrames,
      getRDDs,
      getScalaIntp,
      runScalaCode,
      asH2OFrameFromRDD,
      asH2OFrameFromDF,
      asDataFrame,
      getScalaCodeExecutionResult
    };
    for (let attrname in routinesOnSw) {
      routines[attrname] = routinesOnSw[attrname];
    }
  }
  return routines;
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
function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}