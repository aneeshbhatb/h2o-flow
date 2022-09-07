/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { defer, map } = require('lodash');

const { stringify } = require('../../core/modules/prelude');

module.exports = function(_, _go, _mergeFramesResult) {

  const _frameKey = _mergeFramesResult.key;

  const _viewFrame = () => _.insertAndExecuteCell('cs', `getFrameSummary ${stringify(_frameKey)}`);

  defer(_go);

  return {
    frameKey: _frameKey,
    viewFrame: _viewFrame,
    template: 'flow-merge-frames-output'
  };
};

