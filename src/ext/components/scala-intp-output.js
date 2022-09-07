/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { defer, map } = require('lodash');

const { react, lift, link, signal, signals } = require("../../core/modules/dataflow");

module.exports = function(_, _go, _result) {
  const _scalaIntpView = signal(null);

  const createScalaIntpView = result => ({
    session_id: result.session_id
  });

  _scalaIntpView((createScalaIntpView(_result)));

  defer(_go);

  return {
    scalaIntpView: _scalaIntpView,
    template: 'flow-scala-intp-output'
  };
};


