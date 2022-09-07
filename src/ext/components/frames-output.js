/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { defer, map } = require('lodash');

const { stringify } = require('../../core/modules/prelude');
const { react, lift, link, signal, signals } = require("../../core/modules/dataflow");
const util = require('../../core/modules/util');

module.exports = function(_, _go, _frames) {
  const _frameViews = signal([]);
  const _checkAllFrames = signal(false);
  const _hasSelectedFrames = signal(false);

  let _isCheckingAll = false;
  react(_checkAllFrames, function(checkAll) {
    _isCheckingAll = true;
    for (let view of Array.from(_frameViews())) {
      view.isChecked(checkAll);
    }
    _hasSelectedFrames(checkAll);
    _isCheckingAll = false;
  });

  const createFrameView = function(frame) {
    const _isChecked = signal(false);

    react(_isChecked, function() {
      if (_isCheckingAll) { return; }
      const checkedViews = ((() => {
        const result = [];
        for (let view of Array.from(_frameViews())) {           if (view.isChecked()) {
            result.push(view);
          }
        }
        return result;
      })());
      return _hasSelectedFrames(checkedViews.length > 0);
    });

    const view = function() {
      if (frame.is_text) {
        return _.insertAndExecuteCell('cs', `setupParse source_frames: [ ${stringify(frame.frame_id.name) } ]`);
      } else {
        return _.insertAndExecuteCell('cs', `getFrameSummary ${stringify(frame.frame_id.name)}`);
      }
    };

    const predict = () => _.insertAndExecuteCell('cs', `predict frame: ${stringify(frame.frame_id.name)}`);

    const inspect = () => _.insertAndExecuteCell('cs', `inspect getFrameSummary ${stringify(frame.frame_id.name)}`);

    const createModel = () => _.insertAndExecuteCell('cs', `assist buildModel, null, training_frame: ${stringify(frame.frame_id.name)}`);

    const createAutoML = () => _.insertAndExecuteCell('cs', `assist runAutoML, training_frame: ${stringify(frame.frame_id.name)}`);


    return {
      key: frame.frame_id.name,
      isChecked: _isChecked,
      size: util.formatBytes(frame.byte_size),
      rowCount: frame.rows,
      columnCount: frame.columns,
      isText: frame.is_text,
      view,
      predict,
      inspect,
      createModel,
      createAutoML
    };
  };

  const importFiles = () => _.insertAndExecuteCell('cs', 'importFiles');

  const collectSelectedKeys = () => (() => {
    const result = [];
    for (let view of Array.from(_frameViews())) {
      if (view.isChecked()) {
        result.push(view.key);
      }
    }
    return result;
  })();

  const predictOnFrames = () => _.insertAndExecuteCell('cs', `predict frames: ${stringify(collectSelectedKeys())}`);

  const deleteFrames = () => _.confirm('Are you sure you want to delete these frames?', { acceptCaption: 'Delete Frames', declineCaption: 'Cancel' }, function(accept) {
    if (accept) {
      return _.insertAndExecuteCell('cs', `deleteFrames ${stringify(collectSelectedKeys())}`);
    }
  });
    


  _frameViews(map(_frames, createFrameView));

  defer(_go);

  return {
    frameViews: _frameViews,
    hasFrames: _frames.length > 0,
    importFiles,
    predictOnFrames,
    deleteFrames,
    hasSelectedFrames: _hasSelectedFrames,
    checkAllFrames: _checkAllFrames,
    template: 'flow-frames-output'
  };
};

