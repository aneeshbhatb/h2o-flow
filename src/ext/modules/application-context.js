/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { slot, signal } = require('../../core/modules/dataflow');

exports.init = function(_) {
  _.requestFileGlob = slot();
  _.requestCreateFrame = slot();
  _.requestSplitFrame = slot();
  _.requestImportFile = slot();
  _.requestImportFiles = slot();
  _.requestImportSqlTable = slot();
  _.requestParseFiles = slot();
  _.requestInspect = slot();
  _.requestParseSetup = slot();
  _.requestParseSetupPreview = slot();
  _.requestFrames = slot();
  _.requestFrame = slot();
  _.requestFrameSlice = slot();
  _.requestFrameSummary = slot();
  _.requestFrameDataE = slot();
  _.requestFrameSummarySlice = slot();
  _.requestFrameSummarySliceE = slot();
  _.requestFrameSummaryWithoutData = slot();
  _.requestDeleteFrame = slot();
  _.requestExportFrame = slot();
  _.requestColumnSummary = slot();
  _.requestModelBuilder = slot();
  _.requestModelBuilders = slot();
  _.requestModelBuild = slot();
  _.requestModelInputValidation = slot();
  _.requestAutoMLBuild = slot();
  _.requestPredict = slot();
  _.requestPrediction = slot();
  _.requestPredictions = slot();
  _.requestPartialDependence = slot();
  _.requestPartialDependenceData = slot();
  _.requestGrids = slot();
  _.requestModels = slot();
  _.requestGrid = slot();
  _.requestLeaderboard = slot();
  _.requestModel = slot();
  _.requestPojoPreview = slot();
  _.requestDeleteModel = slot();
  _.requestImportModel = slot();
  _.requestExportModel = slot();
  _.requestJobs = slot();
  _.requestJob = slot();
  _.requestCancelJob = slot();
  _.requestObjects = slot();
  _.requestObject = slot();
  _.requestObjectExists = slot();
  _.requestDeleteObject = slot();
  _.requestPutObject = slot();
  _.requestUploadObject = slot();
  _.requestUploadFile = slot();
  _.requestCloud = slot();
  _.requestTimeline = slot();
  _.requestProfile = slot();
  _.requestStackTrace = slot();
  _.requestRemoveAll = slot();
  _.requestEcho = slot();
  _.requestLogFile = slot();
  _.requestNetworkTest = slot();
  _.requestAbout = slot();
  _.requestShutdown = slot();
  _.requestEndpoints = slot();
  _.requestEndpoint = slot();
  _.requestSchemas = slot();
  _.requestSchema = slot();
  _.requestPacks = slot();
  _.requestPack = slot();
  _.requestFlow = slot();
  _.requestHelpIndex = slot();
  _.requestHelpContent = slot();
  _.requestExec = slot();
  _.ls = slot();
  _.inspect = slot();
  _.plot = slot();
  _.plotlyPlot = slot();
  _.grid = slot();
  _.enumerate = slot();
  //
  // Sparkling-Water
  _.scalaIntpId = signal(-1);
  _.scalaIntpAsync = signal(false);
  _.requestRDDs = slot();
  _.requestDataFrames = slot();
  _.requestScalaIntp = slot();
  _.requestScalaCode = slot();
  _.requestAsH2OFrameFromRDD = slot();
  _.requestAsH2OFrameFromDF = slot();
  _.requestAsDataFrame = slot();
  return _.requestScalaCodeExecutionResult = slot();
};
