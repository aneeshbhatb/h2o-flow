/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { defer, map } = require('lodash');

const { react, lift, link, signal, signals } = require("../../core/modules/dataflow");

module.exports = function(_, _go, _rDDs) {
  const _rDDViews = signal([]);

  const createRDDView = rDD => ({
    id: rDD.rdd_id,
    name: rDD.name,
    partitions: rDD.partitions
  });

  _rDDViews(map(_rDDs, createRDDView));

  defer(_go);

  return {
    rDDViews: _rDDViews,
    hasRDDs: _rDDs.length > 0,
    template: 'flow-rdds-output'
  };
};


