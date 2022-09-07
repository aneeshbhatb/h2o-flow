/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { defer, map } = require('lodash');

const { react, lift, link, signal, signals } = require("../../core/modules/dataflow");

module.exports = function(_, _go, _dataFrames) {
  const _dataFramesViews = signal([]);

  const createDataFrameView = dataFrame => ({
    dataframe_id: dataFrame.dataframe_id,
    partitions: dataFrame.partitions
  });

  _dataFramesViews(map(_dataFrames, createDataFrameView));

  defer(_go);

  return {
    dataFrameViews: _dataFramesViews,
    hasDataFrames: _dataFrames.length > 0,
    template: 'flow-dataframes-output'
  };
};


