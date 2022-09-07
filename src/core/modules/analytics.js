/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { defer } = require('lodash');

module.exports = function(_) {
  link(_.trackEvent, (category, action, label, value) => defer(() => window.ga('send', 'event', category, action, label, value)));

  return link(_.trackException, description => defer(function() {
    _.requestEcho(`FLOW: ${description}`, function() {});

    return window.ga('send', 'exception', {
      exDescription: description,
      exFatal: false,
      appName: 'Flow',
      appVersion: _.Version
    }
    );
  }));
};
