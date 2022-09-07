/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { defer, map } = require('lodash');

const { react, lift, link, signal, signals } = require("../../core/modules/dataflow");

module.exports = function(_, _go, _result) {

  const _scalaCodeView = signal(null);

  const _scalaResponseVisible = signal(false);
  const _scalaLinkText = signal("Show Scala Response");

  const _scalaCodeVisible = signal(false);
  const _scalaCodeLinkText = signal("Show Executed Code");

  const createScalaCodeView = result => ({
    code: result.code,
    output: result.output,
    response: result.response,
    status: result.status,
    scalaResponseVisible: _scalaResponseVisible,
    scalaLinkText: _scalaLinkText,
    scalaCodeVisible: _scalaCodeVisible,
    scalaCodeLinkText: _scalaCodeLinkText,

    toggleResponseVisibility() {
      _scalaResponseVisible(!_scalaResponseVisible());
      if (_scalaResponseVisible()) {
        return _scalaLinkText("Hide Scala Response");
      } else {
        return _scalaLinkText("Show Scala Response");
      }
    },

    toggleCodeVisibility() {
      _scalaCodeVisible(!_scalaCodeVisible());
      if (_scalaCodeVisible()) {
        return _scalaCodeLinkText("Hide Executed Code");
      } else {
        return _scalaCodeLinkText("Show Executed Code");
      }
    }
  });

  _scalaCodeView((createScalaCodeView(_result)));

  defer(_go);

  return {
    scalaCodeView: _scalaCodeView,
    template: 'flow-scala-code-output'
  };
};




