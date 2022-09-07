/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { defer, map, sortBy, uniq } = require('lodash');

const { stringify } = require('../../core/modules/prelude');
const { react, lift, link, signal, signals } = require("../../core/modules/dataflow");

module.exports = function(_, _go, _frameKey) {
  const _frames = signal([]);
  const _frame = signal(null);
  const _lastSplitRatio = signal(1);
  const format4f = value => value.toPrecision(4).replace(/0+$/, '0');
  const _lastSplitRatioText = lift(_lastSplitRatio, function(ratio) { if (isNaN(ratio)) { return ratio; } else { return format4f(ratio); } });
  const _lastSplitKey = signal('');
  const _splits = signals([]);
  const _seed = signal((Math.random() * 1000000) | 0);
  react(_splits, () => updateSplitRatiosAndNames());
  const _validationMessage = signal('');

  const collectRatios = () => Array.from(_splits()).map((entry) =>
    entry.ratio());

  const collectKeys = function() {
    const splitKeys = Array.from(_splits()).map((entry) =>
      entry.key().trim());
    splitKeys.push(_lastSplitKey().trim());
    return splitKeys;
  };

  const createSplitName = (key, ratio) => key + '_' + format4f(ratio);
  
  var updateSplitRatiosAndNames = function() {
    let frame, ratio;
    let totalRatio = 0;
    for (ratio of Array.from(collectRatios())) {
      totalRatio += ratio;
    }
    const lastSplitRatio = 
    _lastSplitRatio(1 - totalRatio);

    const frameKey = (frame = _frame()) ? frame : 'frame';
    for (let entry of Array.from(_splits())) {
      entry.key(createSplitName(frameKey, entry.ratio()));
    }

    _lastSplitKey(createSplitName(frameKey, _lastSplitRatio()));

  };

  const computeSplits = function(go) {
    if (!_frame()) { return go('Frame not specified.'); }

    const splitRatios = collectRatios();

    let totalRatio = 0;
    for (let ratio of Array.from(splitRatios)) {
      if (0 < ratio && ratio < 1) {
        totalRatio += ratio;
      } else {
        return go('One or more split ratios are invalid. Ratios should between 0 and 1.');
      }
    }

    if (totalRatio >= 1) { return go('Sum of ratios is >= 1.'); }

    const splitKeys = collectKeys();
    for (let key of Array.from(splitKeys)) {
      if (key === '') { return go('One or more keys are empty or invalid.'); }
    }

    if (splitKeys.length < 2) { return go('Please specify at least two splits.'); }

    if (splitKeys.length !== (uniq(splitKeys)).length) { return go('Duplicate keys specified.'); }

    return go(null, splitRatios, splitKeys);
  };

  const createSplit = function(ratio) {
    let self;
    const _ratioText = signal('' + ratio);
    const _key = signal('');
    const _ratio = lift(_ratioText, text => parseFloat(text));
    react(_ratioText, updateSplitRatiosAndNames);

    const remove = () => _splits.remove(self);

    return self = {
      key: _key,
      ratioText: _ratioText,
      ratio: _ratio,
      remove
    };
  };

  const addSplitRatio = ratio => _splits.push(createSplit(ratio));

  const addSplit = () => addSplitRatio(0);

  const splitFrame = () => computeSplits(function(error, splitRatios, splitKeys) {
    if (error) {
      return _validationMessage(error);
    } else {
      _validationMessage('');
      return _.insertAndExecuteCell('cs', `splitFrame ${stringify(_frame())}, ${stringify(splitRatios)}, ${stringify(splitKeys)}, ${_seed()}`);
    }
  });

  const initialize = function() {
    _.requestFrames(function(error, frames) {
      if (error) {
        //TODO handle properly
      } else {
        let frameKeys = (Array.from(frames).filter((frame) => !frame.is_text).map((frame) => frame.frame_id.name));
        frameKeys = sortBy(frameKeys);
        _frames(frameKeys);
        return _frame(_frameKey);
      }
    });
    addSplitRatio(0.75);
    return defer(_go);
  };

  initialize();

  return {
    frames: _frames,
    frame: _frame,
    lastSplitRatio: _lastSplitRatio,
    lastSplitRatioText: _lastSplitRatioText,
    lastSplitKey: _lastSplitKey,
    splits: _splits,
    seed: _seed,
    addSplit,
    splitFrame,
    validationMessage: _validationMessage,
    template: 'flow-split-frame-input'
  };
};


