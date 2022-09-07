/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { signal } = require("../../core/modules/dataflow");
const { defer } = require('lodash');

module.exports = function(_, _go, _result) {
  const _dataFrameView = signal(null);

  const createDataFrameView = result => ({
    dataframe_id: result.dataframe_id
  });

  _dataFrameView((createDataFrameView(_result)));

  defer(_go);

  return {
    dataFrameView: _dataFrameView,
    template: 'flow-dataframe-output'
  };
};

