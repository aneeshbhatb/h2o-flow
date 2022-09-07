/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { defer, map } = require('lodash');

const { stringify } = require('../../core/modules/prelude');
const { react, lift, link, signal, signals } = require("../../core/modules/dataflow");
const util = require('../../core/modules/util');
const FlowError = require('../../core/modules/flow-error');

module.exports = function(_, _go) {
  const _exception = signal(null); //TODO display in .pug
  const _destinationKey = signal(`merged-${util.uuid()}`);

  const _frames = signals([]);
  const _selectedLeftFrame = signal(null);
  const _leftColumns = signals([]);
  const _selectedLeftColumn = signal(null);
  const _includeAllLeftRows = signal(false);

  const _selectedRightFrame = signal(null);
  const _rightColumns = signals([]);
  const _selectedRightColumn = signal(null);
  const _includeAllRightRows = signal(false);

  const _canMerge = lift(_selectedLeftFrame, _selectedLeftColumn, _selectedRightFrame, _selectedRightColumn, (lf, lc, rf, rc) => lf && lc && rf && rc);

  react(_selectedLeftFrame, function(frameKey) {
    if (frameKey) {
      return _.requestFrameSummaryWithoutData(frameKey, (error, frame) => _leftColumns(map(frame.columns, (column, i) => ({
        label: column.label,
        index: i
      }))
      ));
    } else {
      _selectedLeftColumn(null);
      return _leftColumns([]);
    }
});

  react(_selectedRightFrame, function(frameKey) {
    if (frameKey) {
      return _.requestFrameSummaryWithoutData(frameKey, (error, frame) => _rightColumns(map(frame.columns, (column, i) => ({
        label: column.label,
        index: i
      }))
      ));
    } else {
      _selectedRightColumn(null);
      return _rightColumns([]);
    }
});

  const _merge = function() {
    if (!_canMerge()) { return; }

    const cs = `mergeFrames ${stringify(_destinationKey())}, ${stringify(_selectedLeftFrame())}, ${_selectedLeftColumn().index}, ${_includeAllLeftRows()}, ${stringify(_selectedRightFrame())}, ${_selectedRightColumn().index}, ${_includeAllRightRows()}`;

    return _.insertAndExecuteCell('cs', cs);
  };

  _.requestFrames(function(error, frames) {
    if (error) {
      return _exception(new FlowError('Error fetching frame list.', error));
    } else {
      return _frames((Array.from(frames).filter((frame) => !frame.is_text).map((frame) => frame.frame_id.name)));
    }
  });

  defer(_go);

  return {
    destinationKey: _destinationKey,
    frames: _frames,
    selectedLeftFrame: _selectedLeftFrame,
    leftColumns: _leftColumns,
    selectedLeftColumn: _selectedLeftColumn,
    includeAllLeftRows: _includeAllLeftRows,
    selectedRightFrame: _selectedRightFrame,
    rightColumns: _rightColumns,
    selectedRightColumn: _selectedRightColumn,
    includeAllRightRows: _includeAllRightRows,
    merge: _merge,
    canMerge: _canMerge,
    template: 'flow-merge-frames-input'
  };
};


