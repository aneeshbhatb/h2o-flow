/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { signal } = require("../../core/modules/dataflow");
const { defer } = require('lodash');

module.exports = function(_, _go, _result) {
  const _h2oframeView = signal(null);
  const createH2oFrameView = result => ({
    h2oframe_id: result.h2oframe_id
  });

  _h2oframeView((createH2oFrameView(_result)));

  defer(_go);

  return {
    h2oframeView: _h2oframeView,
    template: 'flow-h2oframe-output'
  };
};

