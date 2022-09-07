/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { signal } = require('../modules/dataflow');

var traceCauses = function(error, causes) {
  causes.push(error.message);
  if (error.cause) { traceCauses(error.cause, causes); }
  return causes;
};

module.exports = function(_, error) {
  const causes = traceCauses(error, []);
  const message = causes.shift();
  const _isStackVisible = signal(false);
  const toggleStack = () => _isStackVisible(!_isStackVisible());

  _.trackException(message + '; ' + causes.join('; '));

  return {
    message,
    stack: error.stack,
    causes,
    isStackVisible: _isStackVisible,
    toggleStack,
    template: 'flow-failure'
  };
};
