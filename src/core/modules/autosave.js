/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { link } = require("./dataflow");

const warnOnExit = function(e) {
  // message = 'You have unsaved changes to this notebook.'
  const message = 'Warning: you are about to exit Flow.';

  // < IE8 and < FF4
  if (e = e != null ? e : window.event) {
    e.returnValue = message;
  }

  return message;
};

const setDirty = () => window.onbeforeunload = warnOnExit;

const setPristine = () => window.onbeforeunload = null;

exports.init = _ => link(_.ready, function() {
  link(_.setDirty, setDirty);
  return link(_.setPristine, setPristine);
});
