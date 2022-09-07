/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { isArray, map, filter, head } = require('lodash');
const { isObject, isNumber } = require('../../core/modules/prelude');

const { lift, link, signal, signals } = require("../../core/modules/dataflow");
const { stringify } = require('../../core/modules/prelude');
const { iterate } = require('../../core/modules/async');
const JSONbig = require('json-bigint');
const FlowError = require('../../core/modules/flow-error');
const util = require('./util');

exports.init = function(_) {

  const download = function(type, url, go) {
    if (url.substring(0,1) === "/") {
        url = _.ContextPath + url.substring(1);
      }
    return $.ajax({
      dataType: type,
      url,
      success(data, status, xhr) { return go(null, data); },
      error(xhr, status, error) { return go(new FlowError(error)); }
    });
  };

  const optsToString = function(opts) {
    if (opts != null) {
      const str = ` with opts ${ stringify(opts) }`;
      if (str.length > 50) {
        return `${ str.substr(0, 50) }...`;
      } else {
        return str;
      }
    } else {
      return '';
    }
  };

  $.ajaxSetup({converters: { "text json": JSONbig.parse }});

  const http = function(method, path, opts, go) {
    if (path.substring(0,1) === "/") {
      path = _.ContextPath + path.substring(1);
    }

    _.status('server', 'request', path);

    trackPath(path);

    const req = (() => { switch (method) {
      case 'GET':
        return $.getJSON(path);
      case 'POST':
        return $.post(path, opts);
      case 'POSTJSON':
        return $.ajax({
          url: path,
          type: 'POST',
          contentType: 'application/json',
          cache: false,
          data: stringify(opts)
        });
      case 'PUT':
        return $.ajax({url: path, type: method, data: opts});
      case 'DELETE':
        return $.ajax({url: path, type: method});
      case 'UPLOAD':
        return $.ajax({
          url: path,
          type: 'POST',
          data: opts,
          cache: false,
          contentType: false,
          processData: false
        });
    } })();

    req.done(function(data, status, xhr) {
      _.status('server', 'response', path);

      try {
        return go(null, data);
      } catch (error) {
        console.debug(error);
        return go(new FlowError(`Error processing ${method} ${path}`, error));
      }
    });

    return req.fail(function(xhr, status, error) {
      _.status('server', 'error', path);

      const response = xhr.responseJSON;

      const cause = (() => {
        let meta;
        if ((meta = response != null ? response.__meta : undefined) && ((meta.schema_type === 'H2OError') || (meta.schema_type === 'H2OModelBuilderError'))) {
        const serverError = new FlowError(response.exception_msg);
        serverError.stack = `${response.dev_msg} (${response.exception_type})` + "\n  " + response.stacktrace.join("\n  ");
        return serverError;
      } else if ((error != null ? error.message : undefined)) {
        return new FlowError(error.message);
      } else {
        // special-case net::ERR_CONNECTION_REFUSED
        if ((status === 'error') && (xhr.status === 0)) {
          return new FlowError("Could not connect to H2O. Your H2O cloud is currently unresponsive.");
        } else {
          return new FlowError(`HTTP connection failure: status=${status}, code=${xhr.status}, error=${error || '?'}`);
        }
      }
      })();

      return go(new FlowError(`Error calling ${method} ${path}${optsToString(opts)}`, cause));
    });
  };

  const doGet = (path, go) => http('GET', path, null, go);
  const doPost = (path, opts, go) => http('POST', path, opts, go);
  const doPostJSON = (path, opts, go) => http('POSTJSON', path, opts, go);
  const doPut = (path, opts, go) => http('PUT', path, opts, go);
  const doUpload = (path, formData, go) => http('UPLOAD', path, formData, go);
  const doDelete = (path, go) => http('DELETE', path, null, go);

  var trackPath = function(path) {
    try {
      const [ root, version, name ] = Array.from(path.split('/'));
      const [ base, other ] = Array.from(name.split('?'));
      if ((base !== 'Typeahead') && (base !== 'Jobs')) {
        _.trackEvent('api', base, version);
      }
    } catch (e) {}

  };

  const mapWithKey = function(obj, f) {
    const result = [];
    for (let key in obj) {
      const value = obj[key];
      result.push(f(value, key));
    }
    return result;
  };

  const composePath = function(path, opts) {
    if (opts) {
      const params = mapWithKey(opts, (v, k) => `${k}=${v}`);
      return path + '?' + params.join('&');
    } else {
      return path;
    }
  };

  const requestWithOpts = (path, opts, go) => doGet((composePath(path, opts)), go);

  const encodeArrayForPost = function(array) {
    if (array) {
      if (array.length === 0) {
        return null;
      } else {
        const mappedArray = map(array, function(element) {
          if (isNumber(element)) {
            return element;
          }
          if (isObject(element)) {
            return stringify(element);
          }
          return `\"${element}\"`;
        });
        return `[${mappedArray.join(',')}]`;
      }
    } else {
      return null;
    }
  };

  const encodeObject = function(source) {
    const target = {};
    for (let k in source) {
      const v = source[k];
      target[k] = encodeURIComponent(v);
    }
    return target;
  };

  const encodeObjectForPost = function(source) {
    const target = {};
    for (let k in source) {
      const v = source[k];
      target[k] = isArray(v) ? encodeArrayForPost(v) : v;
    }
    return target;
  };

  const unwrap = (go, transform) => (function(error, result) {
    if (error) {
      return go(error);
    } else {
      return go(null, transform(result));
    }
  });

  const requestExec = (ast, go) => doPost('/99/Rapids', { ast }, function(error, result) {
    if (error) {
      return go(error);
    } else {
      //TODO HACK - this api returns a 200 OK on failures
      if (result.error) {
        return go(new FlowError(result.error));
      } else {
        return go(null, result);
      }
    }
  });

  const requestInspect = function(key, go) {
    const opts = {key: encodeURIComponent(key)};
    return requestWithOpts('/3/Inspect', opts, go);
  };

  const requestCreateFrame = (opts, go) => doPost('/3/CreateFrame', opts, go);

  const requestSplitFrame = function(frameKey, splitRatios, splitKeys, go) {
    const opts = {
      dataset: frameKey,
      ratios: encodeArrayForPost(splitRatios),
      dest_keys: encodeArrayForPost(splitKeys)
    };
    return doPost('/3/SplitFrame', opts, go);
  };

  const requestFrames = go => doGet('/3/Frames', function(error, result) {
    if (error) {
      return go(error);
    } else {
      return go(null, result.frames);
    }
  });

  const requestFrame = (key, go, opts) => requestWithOpts(`/3/Frames/${encodeURIComponent(key)}`, opts, function(error, result) {
    if (error) {
      return go(error);
    } else {
      return go(null, head(result.frames));
    }
  });

  const requestFrameSlice = (key, searchTerm, offset, count, go) => //TODO send search term
  doGet(
    `/3/Frames/${encodeURIComponent(key)}?column_offset=${offset}&column_count=${count}`,
    unwrap(go, result => head(result.frames))
  );

  const requestFrameSummary = (key, go) => doGet(`/3/Frames/${encodeURIComponent(key)}/summary`, unwrap(go, result => head(result.frames)));

  const requestFrameSummarySlice = (key, searchTerm, offset, count, go) => //TODO send search term
  doGet(
    `/3/Frames/${encodeURIComponent(key)}/summary?column_offset=${offset}&column_count=${count}&_exclude_fields=frames/columns/data,frames/columns/domain,frames/columns/histogram_bins,frames/columns/percentiles`,
    unwrap(go, result => head(result.frames))
  );

  const requestFrameSummaryWithoutData = (key, go) => doGet(`/3/Frames/${encodeURIComponent(key)}/summary?_exclude_fields=frames/chunk_summary,frames/distribution_summary,frames/columns/data,frames/columns/domain,frames/columns/histogram_bins,frames/columns/percentiles`, function(error, result) {
    if (error) {
      return go(error);
    } else {
      return go(null, head(result.frames));
    }
  });

  const requestDeleteFrame = (key, go) => doDelete(`/3/Frames/${encodeURIComponent(key)}`, go);

  const requestExportFrame = function(key, path, overwrite, go) {
    const params = {
      path,
      force: overwrite ? 'true' : 'false'
    };
    return doPost(`/3/Frames/${encodeURIComponent(key)}/export`, params, go);
  };

  const requestColumnSummary = (frameKey, column, go) => doGet(`/3/Frames/${encodeURIComponent(frameKey)}/columns/${encodeURIComponent(column)}/summary`, unwrap(go, result => head(result.frames)));

  const requestJobs = go => doGet('/3/Jobs', function(error, result) {
    if (error) {
      return go(new FlowError('Error fetching jobs', error));
    } else {
      return go(null, result.jobs);
    }
  });

  const requestJob = (key, go) => doGet(`/3/Jobs/${encodeURIComponent(key)}`, function(error, result) {
    if (error) {
      return go(new FlowError(`Error fetching job '${key}'`, error));
    } else {
      return go(null, head(result.jobs));
    }
  });

  const requestCancelJob = (key, go) => doPost(`/3/Jobs/${encodeURIComponent(key)}/cancel`, {}, function(error, result) {
    if (error) {
      return go(new FlowError(`Error canceling job '${key}'`, error));
    } else {
      return go(null);
    }
  });

  const requestFileGlob = function(path, limit, go) {
    const opts = {
      src: encodeURIComponent(path),
      limit
    };
    return requestWithOpts('/3/Typeahead/files', opts, go);
  };

  const requestImportFiles = function(paths, go) {
    const tasks = map(paths, path => go => requestImportFile(path, go));
    return (iterate(tasks))(go);
  };

  var requestImportFile = function(path, go) {
    const opts = {path: encodeURIComponent(path)};
    return requestWithOpts('/3/ImportFiles', opts, go);
  };

  const requestImportSqlTable = function(args, go) {
    const decryptedPassword = util.decryptPassword(args.password);
    const opts = {
      connection_url: args.connection_url,
      table: args.table,
      username: args.username,
      password: decryptedPassword,
      fetch_mode: args.fetch_mode
    };
    if (args.columns !== '') {
      opts.columns = args.columns;
    }
    return doPost('/99/ImportSQLTable', opts, go);
  };

  const requestParseSetup = function(sourceKeys, go) {
    const opts =
      {source_frames: encodeArrayForPost(sourceKeys)};
    return doPost('/3/ParseSetup', opts, go);
  };

  const requestParseSetupPreview = function(sourceKeys, parseType, separator, useSingleQuotes, checkHeader, columnTypes, escapeChar, go) {
    const opts = {
      source_frames: encodeArrayForPost(sourceKeys),
      parse_type: parseType,
      separator,
      single_quotes: useSingleQuotes,
      check_header: checkHeader,
      column_types: encodeArrayForPost(columnTypes),
      escapechar: escapeChar
    };
    return doPost('/3/ParseSetup', opts, go);
  };

  const requestParseFiles = function(sourceKeys, destinationKey, parseType, separator, columnCount, useSingleQuotes, columnNames, columnTypes, deleteOnDone, checkHeader, chunkSize, escapeChar, go) {
    const opts = {
      destination_frame: destinationKey,
      source_frames: encodeArrayForPost(sourceKeys),
      parse_type: parseType,
      separator,
      number_columns: columnCount,
      single_quotes: useSingleQuotes,
      column_names: encodeArrayForPost(columnNames),
      column_types: encodeArrayForPost(columnTypes),
      check_header: checkHeader,
      delete_on_done: deleteOnDone,
      chunk_size: chunkSize,
      escapechar: escapeChar
    };
    return doPost('/3/Parse', opts, go);
  };

  // Create data for partial dependence plot(s)
  // for the specified model and frame.
  //
  // make a post request to h2o-3 to do request
  // the data about the specified model and frame
  // subject to the other options `opts`
  //
  // returns a job
  const requestPartialDependence = (opts, go) => doPost('/3/PartialDependence/', opts, go);


  // make a post request to h2o-3 to do request
  // the data about the specified model and frame
  // subject to the other options `opts`
  //
  // returns a json response that contains
  //
  const requestPartialDependenceData = (key, go) => doGet(`/3/PartialDependence/${encodeURIComponent(key)}`, function(error, result) {
    if (error) {
      return go(error, result);
    } else { return go(error, result); }
  });

  const requestGrids = go => doGet("/99/Grids", function(error, result) {
    if (error) {
      return go(error, result);
    } else {
      return go(error, result.grids);
    }
  });

  const requestLeaderboard = (key, go) => doGet(`/99/AutoML/${encodeURIComponent(key)}`, function(error, result) {
    if (error) {
      return go(error, result);
    } else {
      return go(error, result);
    }
  });


  const requestModels = (go, opts) => requestWithOpts('/3/Models', opts, function(error, result) {
    if (error) {
      return go(error, result);
    } else {
      return go(error, result.models);
    }
  });

  const requestGrid = function(key, opts, go) {
    let params = undefined;
    if (opts) {
      params = {};
      if (opts.sort_by) {
        params.sort_by = encodeURIComponent(opts.sort_by);
      }
      if ((opts.decreasing === true) || (opts.decreasing === false)) {
        params.decreasing = opts.decreasing;
      }
    }
    return doGet((composePath(`/99/Grids/${encodeURIComponent(key)}`, params)), go);
  };

  const requestModel = (key, go) => doGet(`/3/Models/${encodeURIComponent(key)}`, function(error, result) {
    if (error) {
      return go(error, result);
    } else {
      return go(error, head(result.models));
    }
  });

  const requestPojoPreview = (key, go) => download('text', `/3/Models.java/${encodeURIComponent(key)}/preview`, go);

  const requestDeleteModel = (key, go) => doDelete(`/3/Models/${encodeURIComponent(key)}`, go);

  const requestImportModel = function(path, overwrite, go) {
    const opts = {
      dir: path,
      force: overwrite
    };
    return doPost("/99/Models.bin/not_in_use", opts, go);
  };

  const requestExportModel = (format, key, path, overwrite, go) => doGet(`/99/Models.${format}/${encodeURIComponent(key)}?dir=${encodeURIComponent(path)}&force=${overwrite}`, go);

  // TODO Obsolete
  const requestModelBuildersVisibility = go => doGet('/3/Configuration/ModelBuilders/visibility', unwrap(go, result => result.value));

  let __modelBuilders = null;
  let __modelBuilderEndpoints = null;
  let __gridModelBuilderEndpoints = null;
  const cacheModelBuilders = function(modelBuilders) {
    const modelBuilderEndpoints = {};
    const gridModelBuilderEndpoints = {};
    for (let modelBuilder of Array.from(modelBuilders)) {
      modelBuilderEndpoints[modelBuilder.algo] = `/${modelBuilder.__meta.schema_version}/ModelBuilders/${modelBuilder.algo}`;
      gridModelBuilderEndpoints[modelBuilder.algo] = `/99/Grid/${modelBuilder.algo}`;
    }
    __modelBuilderEndpoints = modelBuilderEndpoints;
    __gridModelBuilderEndpoints = gridModelBuilderEndpoints;
    return __modelBuilders = modelBuilders;
  };

  const getModelBuilders = () => __modelBuilders;
  const getModelBuilderEndpoint = algo => __modelBuilderEndpoints[algo];
  const getGridModelBuilderEndpoint = algo => __gridModelBuilderEndpoints[algo];

  const requestModelBuilders = function(go) {
    let modelBuilders;
    if (modelBuilders = getModelBuilders()) {
      return go(null, modelBuilders);
    } else {
      // requestModelBuildersVisibility (error, visibility) ->
      //  visibility = if error then 'Stable' else visibility
      const visibility = 'Stable';
      return doGet("/3/ModelBuilders", unwrap(go, function(result) {
        let builder;
        const builders = ((() => {
          const result1 = [];
          for (let algo in result.model_builders) {
            builder = result.model_builders[algo];
            result1.push(builder);
          }
          return result1;
        })());
        const availableBuilders = (() => { switch (visibility) {
          case 'Stable':
            return (() => {
              const result2 = [];
              for (builder of Array.from(builders)) {
                if (builder.visibility === visibility) {
                  result2.push(builder);
                }
              }
              return result2;
            })();
          case 'Beta':
            return (() => {
              const result3 = [];
              for (builder of Array.from(builders)) {
                if ((builder.visibility === visibility) || (builder.visibility === 'Stable')) {
                  result3.push(builder);
                }
              }
              return result3;
            })();
          default:
            return builders;
        } })();
        return cacheModelBuilders(availableBuilders);
      })
      );
    }
  };

  const requestModelBuilder = (algo, go) => doGet(getModelBuilderEndpoint(algo), go);

  const requestModelInputValidation = (algo, parameters, go) => doPost(`${getModelBuilderEndpoint(algo)}/parameters`, (encodeObjectForPost(parameters)), go);

  const requestModelBuild = function(algo, parameters, go) {
    _.trackEvent('model', algo);
    if (parameters.hyper_parameters) {
      // super-hack: nest this object as stringified json
      parameters.hyper_parameters = stringify(parameters.hyper_parameters);
      if (parameters.search_criteria) {
        parameters.search_criteria = stringify(parameters.search_criteria);
      }
      return doPost(getGridModelBuilderEndpoint(algo), (encodeObjectForPost(parameters)), go);
    } else {
      return doPost(getModelBuilderEndpoint(algo), (encodeObjectForPost(parameters)), go);
    }
  };

  const requestAutoMLBuild = (parameters, go) => doPostJSON("/99/AutoMLBuilder", parameters, go);

  const requestPredict = function(destinationKey, modelKey, frameKey, options, go) {
    let opt;
    const opts = {};
    if (destinationKey) { opts.predictions_frame = destinationKey; }
    if (undefined !== (opt = options.reconstruction_error)) {
      opts.reconstruction_error = opt;
    }
    if (undefined !== (opt = options.deep_features_hidden_layer)) {
      opts.deep_features_hidden_layer = opt;
    }
    if (undefined !== (opt = options.leaf_node_assignment)) {
      opts.leaf_node_assignment = opt;
    }
    if (undefined !== (opt = options.exemplar_index)) {
      opts.exemplar_index = opt;
    }

    return doPost(`/3/Predictions/models/${encodeURIComponent(modelKey)}/frames/${encodeURIComponent(frameKey)}`, opts, function(error, result) {
      if (error) {
        return go(error);
      } else {
        return go(null, result);
      }
    });
  };

  const requestPrediction = (modelKey, frameKey, go) => doGet(`/3/ModelMetrics/models/${encodeURIComponent(modelKey)}/frames/${encodeURIComponent(frameKey)}`, function(error, result) {
    if (error) {
      return go(error);
    } else {
      return go(null, result);
    }
  });

  const requestPredictions = function(modelKey, frameKey, _go) {
    const go = function(error, result) {
      let prediction;
      if (error) {
        return _go(error);
      } else {
        //
        // TODO workaround for a filtering bug in the API
        //
        const predictions = (() => {
          const result1 = [];
          for (prediction of Array.from(result.model_metrics)) {
            if (modelKey && (prediction.model.name !== modelKey)) {
              result1.push(null);
            } else if (frameKey && (prediction.frame.name !== frameKey)) {
              result1.push(null);
            } else {
              result1.push(prediction);
            }
          }
          return result1;
        })();
        return _go(null, ((() => {
          const result2 = [];
          for (prediction of Array.from(predictions)) {             if (prediction) {
              result2.push(prediction);
            }
          }
          return result2;
        })()));
      }
    };

    if (modelKey && frameKey) {
      return doGet(`/3/ModelMetrics/models/${encodeURIComponent(modelKey)}/frames/${encodeURIComponent(frameKey)}`, go);
    } else if (modelKey) {
      return doGet(`/3/ModelMetrics/models/${encodeURIComponent(modelKey)}`, go);
    } else if (frameKey) {
      return doGet(`/3/ModelMetrics/frames/${encodeURIComponent(frameKey)}`, go);
    } else {
      return doGet("/3/ModelMetrics", go);
    }
  };

//
//  requestObjects = (type, go) ->
//    go null, Flow.LocalStorage.list type
//
//  requestObject = (type, name, go) ->
//    go null, Flow.LocalStorage.read type, name
//
//  requestDeleteObject = (type, name, go) ->
//    go null, Flow.LocalStorage.purge type, name
//
//  requestPutObject = (type, name, obj, go) ->
//    go null, Flow.LocalStorage.write type, name, obj
//
  let _storageConfiguration = null;
  const requestIsStorageConfigured = function(go) {
    if (_storageConfiguration) {
      return go(null, _storageConfiguration.isConfigured);
    } else {
      return doGet("/3/NodePersistentStorage/configured", function(error, result) {
        _storageConfiguration = {isConfigured: error ? false : result.configured};
        return go(null, _storageConfiguration.isConfigured);
      });
    }
  };

  const requestObjects = (type, go) => doGet(`/3/NodePersistentStorage/${encodeURIComponent(type)}`, unwrap(go, result => result.entries));

  const requestObjectExists = (type, name, go) => doGet(`/3/NodePersistentStorage/categories/${encodeURIComponent(type)}/names/${encodeURIComponent(name)}/exists`, (error, result) => go(null, error ? false : result.exists));

  const requestObject = (type, name, go) => doGet(`/3/NodePersistentStorage/${encodeURIComponent(type)}/${encodeURIComponent(name)}`, unwrap(go, result => JSON.parse(result.value)));

  const requestDeleteObject = (type, name, go) => doDelete(`/3/NodePersistentStorage/${encodeURIComponent(type)}/${encodeURIComponent(name)}`, go);

  const requestPutObject = function(type, name, value, go) {
    let uri = `/3/NodePersistentStorage/${encodeURIComponent(type)}`;
    if (name) { uri += `/${encodeURIComponent(name)}`; }
    return doPost(uri, { value: stringify(value, null, 2) }, unwrap(go, result => result.name));
  };

  const requestUploadObject = function(type, name, formData, go) {
    let uri = `/3/NodePersistentStorage.bin/${encodeURIComponent(type)}`;
    if (name) { uri += `/${encodeURIComponent(name)}`; }
    return doUpload(uri, formData, unwrap(go, result => result.name));
  };

  const requestUploadFile = (key, formData, go) => doUpload(`/3/PostFile?destination_frame=${encodeURIComponent(key)}`, formData, go);

  const requestCloud = go => doGet('/3/Cloud', go);

  const requestTimeline = go => doGet('/3/Timeline', go);

  const requestProfile = (depth, go) => doGet(`/3/Profiler?depth=${depth}`, go);

  const requestStackTrace = go => doGet('/3/JStack', go);

  const requestRemoveAll = go => doDelete('/3/DKV', go);

  const requestEcho = (message, go) => doPost('/3/LogAndEcho', { message }, go);

  const requestLogFile = (nodeIpPort, fileType, go) => doGet(`/3/Logs/nodes/${nodeIpPort}/files/${fileType}`, go);

  const requestNetworkTest = go => doGet('/3/NetworkTest', go);

  const requestAbout = go => doGet('/3/About', go);

  const requestShutdown = go => doPost("/3/Shutdown", {}, go);

  const requestEndpoints = go => doGet('/3/Metadata/endpoints', go);

  const requestEndpoint = (index, go) => doGet(`/3/Metadata/endpoints/${index}`, go);

  const requestSchemas = go => doGet('/3/Metadata/schemas', go);

  const requestSchema = (name, go) => doGet(`/3/Metadata/schemas/${encodeURIComponent(name)}`, go);

  const getLines = data => filter((data.split('\n')), function(line) { if (line.trim()) { return true; } else { return false; } });

  const requestPacks = go => download('text', '/flow/packs/index.list', unwrap(go, getLines));

  const requestPack = (packName, go) => download('text', `/flow/packs/${encodeURIComponent(packName)}/index.list`, unwrap(go, getLines));

  const requestFlow = (packName, flowName, go) => download('json', `/flow/packs/${encodeURIComponent(packName)}/${encodeURIComponent(flowName)}`, go);

  const requestHelpIndex = go => download('json', '/flow/help/catalog.json', go);

  const requestHelpContent = (name, go) => download('text', `/flow/help/${name}.html`, go);

  const requestRDDs = go => doGet('/3/RDDs', go);

  const requestDataFrames = go => doGet('/3/dataframes', go);

  const requestScalaIntp = go => doPost('/3/scalaint', {}, go);

  const requestScalaCode = (session_id, code, go) => doPost(`/3/scalaint/${session_id}`, {code}, go);

  const requestAsH2OFrameFromRDD = function(rdd_id, name, go) {
    if (name===undefined) {
      return doPost(`/3/RDDs/${rdd_id}/h2oframe`, {}, go);
    } else {
      return doPost(`/3/RDDs/${rdd_id}/h2oframe`, {h2oframe_id: name}, go);
    }
  };

  const requestAsH2OFrameFromDF = function(df_id, name, go) {
    if (name===undefined) {
      return doPost(`/3/dataframes/${df_id}/h2oframe`, {}, go);
    } else {
      return doPost(`/3/dataframes/${df_id}/h2oframe`, {h2oframe_id: name}, go);
    }
  };

  const requestAsDataFrame = function(hf_id, name, go) {
    if (name===undefined) {
      return doPost(`/3/h2oframes/${hf_id}/dataframe`, {}, go);
    } else {
      return doPost(`/3/h2oframes/${hf_id}/dataframe`, {dataframe_id: name}, go);
    }
  };

  const requestScalaCodeExecutionResult = (key, go) => doPost(`/3/scalaint/result/${key}`, {result_key: key}, go);

  link(_.requestInspect, requestInspect);
  link(_.requestCreateFrame, requestCreateFrame);
  link(_.requestSplitFrame, requestSplitFrame);
  link(_.requestFrames, requestFrames);
  link(_.requestFrame, requestFrame);
  link(_.requestFrameSlice, requestFrameSlice);
  link(_.requestFrameSummary, requestFrameSummary);
  link(_.requestFrameSummaryWithoutData, requestFrameSummaryWithoutData);
  link(_.requestFrameSummarySlice, requestFrameSummarySlice);
  link(_.requestDeleteFrame, requestDeleteFrame);
  link(_.requestExportFrame, requestExportFrame);
  link(_.requestColumnSummary, requestColumnSummary);
  link(_.requestJobs, requestJobs);
  link(_.requestJob, requestJob);
  link(_.requestCancelJob, requestCancelJob);
  link(_.requestFileGlob, requestFileGlob);
  link(_.requestImportFiles, requestImportFiles);
  link(_.requestImportFile, requestImportFile);
  link(_.requestImportSqlTable, requestImportSqlTable);
  link(_.requestParseSetup, requestParseSetup);
  link(_.requestParseSetupPreview, requestParseSetupPreview);
  link(_.requestParseFiles, requestParseFiles);
  link(_.requestPartialDependence, requestPartialDependence);
  link(_.requestPartialDependenceData, requestPartialDependenceData);
  link(_.requestGrids, requestGrids);
  link(_.requestLeaderboard, requestLeaderboard);
  link(_.requestModels, requestModels);
  link(_.requestGrid, requestGrid);
  link(_.requestModel, requestModel);
  link(_.requestPojoPreview, requestPojoPreview);
  link(_.requestDeleteModel, requestDeleteModel);
  link(_.requestImportModel, requestImportModel);
  link(_.requestExportModel, requestExportModel);
  link(_.requestModelBuilder, requestModelBuilder);
  link(_.requestModelBuilders, requestModelBuilders);
  link(_.requestModelBuild, requestModelBuild);
  link(_.requestModelInputValidation, requestModelInputValidation);
  link(_.requestAutoMLBuild, requestAutoMLBuild);
  link(_.requestPredict, requestPredict);
  link(_.requestPrediction, requestPrediction);
  link(_.requestPredictions, requestPredictions);
  link(_.requestObjects, requestObjects);
  link(_.requestObject, requestObject);
  link(_.requestObjectExists, requestObjectExists);
  link(_.requestDeleteObject, requestDeleteObject);
  link(_.requestPutObject, requestPutObject);
  link(_.requestUploadObject, requestUploadObject);
  link(_.requestUploadFile, requestUploadFile);
  link(_.requestCloud, requestCloud);
  link(_.requestTimeline, requestTimeline);
  link(_.requestProfile, requestProfile);
  link(_.requestStackTrace, requestStackTrace);
  link(_.requestRemoveAll, requestRemoveAll);
  link(_.requestEcho, requestEcho);
  link(_.requestLogFile, requestLogFile);
  link(_.requestNetworkTest, requestNetworkTest);
  link(_.requestAbout, requestAbout);
  link(_.requestShutdown, requestShutdown);
  link(_.requestEndpoints, requestEndpoints);
  link(_.requestEndpoint, requestEndpoint);
  link(_.requestSchemas, requestSchemas);
  link(_.requestSchema, requestSchema);
  link(_.requestPacks, requestPacks);
  link(_.requestPack, requestPack);
  link(_.requestFlow, requestFlow);
  link(_.requestHelpIndex, requestHelpIndex);
  link(_.requestHelpContent, requestHelpContent);
  link(_.requestExec, requestExec);
  //
  // Sparkling-Water
  link(_.requestRDDs, requestRDDs);
  link(_.requestDataFrames, requestDataFrames);
  link(_.requestScalaIntp, requestScalaIntp);
  link(_.requestScalaCode, requestScalaCode);
  link(_.requestAsH2OFrameFromDF, requestAsH2OFrameFromDF);
  link(_.requestAsH2OFrameFromRDD, requestAsH2OFrameFromRDD);
  link(_.requestAsDataFrame, requestAsDataFrame);
  return link(_.requestScalaCodeExecutionResult, requestScalaCodeExecutionResult);
};


