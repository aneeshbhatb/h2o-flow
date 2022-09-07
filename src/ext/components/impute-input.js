/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { defer } = require('lodash');

const { stringify } = require('../../core/modules/prelude');
const { react, lift, link, signal, signals } = require("../../core/modules/dataflow");

const createOptions = options => Array.from(options).map((option) => ({
  caption: option,
  value: option.toLowerCase()
}));

const _allMethods = createOptions([
   'Mean',
   'Median',
   'Mode'
]);
const _allCombineMethods = createOptions([
   'Interpolate',
   'Average',
   'Low',
   'High'
]);

module.exports = function(_, _go, opts) {
  if (opts == null) { opts = {}; }
  const _frames = signal([]);

  const _frame = signal(null);

  const _hasFrame = lift(_frame, function(frame) { if (frame) { return true; } else { return false; } });

  const _columns = signal([]);

  const _column = signal(null);

  const _methods = _allMethods;

  const _method = signal(_allMethods[0]);

  const _canUseCombineMethod = lift(_method, method => method.value === 'median');

  const _combineMethods = _allCombineMethods; 

  const _combineMethod = signal(_allCombineMethods[0]);

  const _canGroupByColumns = lift(_method, method => method.value !== 'median');

  const _groupByColumns = signals([]);

  const _canImpute = lift(_frame, _column, (frame, column) => frame && column);

  const impute = function() {
    const method = _method();
    const arg = {
      frame: _frame(),
      column: _column(),
      method: method.value
    };

    if (method.value === 'median') {
      let combineMethod;
      if (combineMethod = _combineMethod()) {
        arg.combineMethod = combineMethod.value;
      }
    } else {
      const groupByColumns = _groupByColumns();
      if (groupByColumns.length) {
        arg.groupByColumns = groupByColumns;
      }
    }

    return _.insertAndExecuteCell('cs', `imputeColumn ${JSON.stringify(arg)}`);
  };

  _.requestFrames(function(error, frames) {
    if (error) {
      //TODO handle properly
    } else {
      _frames((Array.from(frames).filter((frame) => !frame.is_text).map((frame) => frame.frame_id.name)));
      if (opts.frame) {
        _frame(opts.frame);
      }

      return;
    }
  });

  react(_frame, function(frame) {
    if (frame) {
      return _.requestFrameSummaryWithoutData(frame, function(error, frame) {
        if (error) {
          //TODO handle properly
        } else {
          _columns((Array.from(frame.columns).map((column) => column.label)));
          if (opts.column) {
            _column(opts.column);
            return delete opts.column;
          }
        }
      }); //HACK
    } else {
      return _columns([]);
    }
});
  
  defer(_go);

  return {
    frames: _frames,
    frame: _frame,
    hasFrame: _hasFrame,
    columns: _columns,
    column: _column,
    methods: _methods,
    method: _method,
    canUseCombineMethod: _canUseCombineMethod,
    combineMethods: _combineMethods,
    combineMethod: _combineMethod,
    canGroupByColumns: _canGroupByColumns,
    groupByColumns: _groupByColumns,
    canImpute: _canImpute,
    impute,
    template: 'flow-impute-input'
  };
};
