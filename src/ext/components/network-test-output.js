/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { defer, map } = require('lodash');

const { react, lift, link, signal, signals } = require("../../core/modules/dataflow");

module.exports = function(_, _go, _testResult) {
  const _result = signal(null);
  const render = _.plot(g => g(
    g.select(),
    g.from(_.inspect('result', _testResult))
  ));

  render(function(error, vis) {
    if (error) {
      return console.debug(error);
    } else {
      return _result(vis.element);
    }
  });

  defer(_go);

  return {
    result: _result,
    template: 'flow-network-test-output'
  };
};
      
