/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { defer } = require('lodash');

const { stringify } = require('../../core/modules/prelude');
const { react, lift, link, signal, signals } = require("../../core/modules/dataflow");

module.exports = function(_, _go, frameKey, path, opt) {
  const _frames = signal([]);
  const _selectedFrame = signal(frameKey); 
  const _path = signal(null); 
  const _overwrite = signal(true);
  const _canExportFrame = lift(_selectedFrame, _path, (frame, path) => frame && path);

  const exportFrame = () => _.insertAndExecuteCell('cs', `exportFrame ${stringify(_selectedFrame())}, ${stringify(_path())}, overwrite: ${_overwrite() ? 'true' : 'false'}`);

  _.requestFrames(function(error, frames) {
    if (error) {
      //TODO handle properly
    } else {
      _frames((Array.from(frames).map((frame) => frame.frame_id.name)));
      return _selectedFrame(frameKey);
    }
  });

  defer(_go);

  return {
    frames: _frames,
    selectedFrame: _selectedFrame,
    path: _path,
    overwrite: _overwrite,
    canExportFrame: _canExportFrame,
    exportFrame,
    template: 'flow-export-frame-input'
  };
};

