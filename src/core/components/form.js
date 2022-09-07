/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { act, react, lift, merge, isSignal, signal, signals } = require("../../core/modules/dataflow");
const { defer } = require('lodash');

module.exports = function(_, _form, _go) {

  defer(_go);

  return {
    form: _form,
    template: 'flow-form',
    templateOf(control) { return control.template; }
  };
};
