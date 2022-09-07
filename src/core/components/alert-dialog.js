/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const lodash = require('lodash');

const util = require('../modules/util');

module.exports = function(_, _message, _opts, _go) {

  if (_opts == null) { _opts = {}; }
  lodash.defaults(_opts, {
    title: 'Alert',
    acceptCaption: 'OK'
  }
  );

  const accept = () => _go(true);

  return {
    title: _opts.title,
    acceptCaption: _opts.acceptCaption,
    message: util.multilineTextToHTML(_message),
    accept,
    template: 'alert-dialog'
  };
};
