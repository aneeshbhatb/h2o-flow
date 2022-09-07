/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { defer, map } = require('lodash');

const { stringify } = require('../../core/modules/prelude');

module.exports = function(_, _go, _splitFrameResult) {

  let key;
  const computeRatios = function(sourceRatios) {
    let total = 0;
    const ratios = (() => {
      const result = [];
      for (let ratio of Array.from(sourceRatios)) {
        total += ratio;
        result.push(ratio);
      }
      return result;
    })();
    ratios.push(1 - total);
    return ratios;
  };

  const createFrameView = function(key, ratio) {
    let self;
    const view = () => _.insertAndExecuteCell('cs', `getFrameSummary ${stringify(key)}`);

    return self = {
      key,
      ratio,
      view
    };
  };

  const _ratios = computeRatios(_splitFrameResult.ratios);
  const _frames = (() => {
    const result = [];
    for (let index = 0; index < _splitFrameResult.keys.length; index++) {
      key = _splitFrameResult.keys[index];
      result.push(createFrameView(key, _ratios[index]));
    }
    return result;
  })();

  defer(_go);

  return {
    frames: _frames,
    template: 'flow-split-frame-output'
  };
};
