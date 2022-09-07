/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const applicationContext = require("./application-context");
const proxy = require('./proxy');

exports.init = function(_) {
  applicationContext.init(_);
  return proxy.init(_);
};

