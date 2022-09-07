/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { defer, map, filter, throttle } = require('lodash');

const { stringify } = require('../../core/modules/prelude');
const { react, lift, link, signal, signals } = require("../../core/modules/dataflow");
const util = require('../../core/modules/util');
const FlowError = require('../../core/modules/flow-error');

module.exports = function(_, _go) {
  const _exception = signal(null); 
  const _destinationKey = signal(`pdp-${util.uuid()}`);

  const _frames = signals([]);
  const _models = signals([]);
  const _selectedModel = signals(null);
  const _selectedFrame = signal(null);
  const _useCustomColumns = signal(false);
  const _columns = signal([]);
  const _columnValues = signal([]);
  const _columns2d = signal([]);
  const _nbins = signal(20);
  const _row_index = signal(-1);
  const _useCustomTargets = signal(false);
  const _targets = signal([]);

  const MaxItemsPerPage = 100;

  const changeSelection = function(source, value) {
    for (let entry of Array.from(source)) {
      entry.isSelected(value);
    }
  };

  // search & filter columns
  const _visibleColumns = signal([]);
  const _filteredColumns = signal([]);
  const _currentColumnsPage = signal(0);
  const _maxColumnsPages = lift(_filteredColumns, entries => Math.ceil(entries.length / MaxItemsPerPage));
  const _canGoToPreviousColumnsPage = lift(_currentColumnsPage, index => index > 0);
  const _canGoToNextColumnsPage = lift(_maxColumnsPages, _currentColumnsPage, (maxColumnsPages, index) => index < (maxColumnsPages - 1));

  const _columnsSelectionCount = signal(0);
  let _isUpdatingColumnsSelectionCount = false;

  const _searchTermColumns = signal('');
  const _searchColumnsCaption = lift(_columns, _filteredColumns, _columnsSelectionCount, _currentColumnsPage, _maxColumnsPages, function(entries, filteredColumns, columnsSelectionCount, currentColumnsPage, maxColumnsPages) {
    let caption = maxColumnsPages === 0 ? '' : `Showing page ${currentColumnsPage + 1} of ${maxColumnsPages}.`;
    if (filteredColumns.length !== entries.length) {
      caption += ` Filtered ${filteredColumns.length} of ${entries.length}.`;
    }
    if (columnsSelectionCount !== 0) {
      caption += ` ${columnsSelectionCount} selected for PDP calculations.`;
    }
    return caption;
  });

  const blockColumnsSelectionUpdates = function(f) {
    _isUpdatingColumnsSelectionCount = true;
    f();
    return _isUpdatingColumnsSelectionCount = false;
  };

  const incrementColumnsSelectionCount = amount => _columnsSelectionCount(_columnsSelectionCount() + amount);

  const _hasFilteredColumns = lift(_columns, entries => entries.length > 0);

  const filterColumns = function() {
    const searchTermColumns = _searchTermColumns().trim();

    const filteredColumns = [];

    const iterable = _columns();
    for (let i = 0; i < iterable.length; i++) {
      const entry = iterable[i];
      let hide = false;
      if ((searchTermColumns !== '') && (-1 === entry.value.toLowerCase().indexOf(searchTermColumns.toLowerCase()))) {
        hide = true;
      }

      if (!hide) {
        filteredColumns.push(entry);
      }
    }

    _filteredColumns(filteredColumns);

    const start = _currentColumnsPage() * MaxItemsPerPage;
    return _visibleColumns(_filteredColumns().slice(start, start + MaxItemsPerPage));
  };

  // when searchTermColumns changes, filterColumns is called
  react(_searchTermColumns, throttle(filterColumns, 500));

  const _selectFilteredColumns = function() {
    const entries = _filteredColumns();
    blockColumnsSelectionUpdates(() => changeSelection(entries, true));
    return _columnsSelectionCount(entries.length);
  };

  const _deselectFilteredColumns = function() {
    blockColumnsSelectionUpdates(() => changeSelection(_columns(), false));
    return _columnsSelectionCount(0);
  };

  const _goToPreviousColumnsPage = function() {
    if (_canGoToPreviousColumnsPage()) {
      _currentColumnsPage(_currentColumnsPage() - 1);
      filterColumns();
    }
  };

  const _goToNextColumnsPage = function() {
    if (_canGoToNextColumnsPage()) {
      _currentColumnsPage(_currentColumnsPage() + 1);
      filterColumns();
    }
  };

  const _selectedColsToString = function() {
    let cols = "";
    for (let col of Array.from(_columns())) {
      if (col.isSelected()) {
        cols = cols + "\"" + col.value + "\",";
      }
    }
    if (cols !== "") {
      cols ="[" + cols + "]";
    }
    return cols;
  };
  // end of search & filter columns

  // search & filter targets
  const _visibleTargets = signal([]);
  const _filteredTargets = signal([]);
  const _currentTargetsPage = signal(0);
  const _maxTargetsPages = lift(_filteredTargets, entries => Math.ceil(entries.length / MaxItemsPerPage));
  const _canGoToPreviousTargetsPage = lift(_currentTargetsPage, index => index > 0);
  const _canGoToNextTargetsPage = lift(_maxTargetsPages, _currentTargetsPage, (maxTargetsPages, index) => index < (maxTargetsPages - 1));

  const _targetsSelectionCount = signal(0);
  let _isUpdatingTargetsSelectionCount = false;

  const _searchTermTargets = signal('');
  const _searchTargetsCaption = lift(_targets, _filteredTargets, _targetsSelectionCount, _currentTargetsPage, _maxTargetsPages, function(entries, filteredTargets, targetsSelectionCount, currentTargetsPage, maxTargetsPages) {
    let caption = maxTargetsPages === 0 ? '' : `Showing page ${currentTargetsPage + 1} of ${maxTargetsPages}.`;
    if (filteredTargets.length !== entries.length) {
      caption += ` Filtered ${filteredTargets.length} of ${entries.length}.`;
    }
    if (targetsSelectionCount !== 0) {
      caption += ` ${targetsSelectionCount} selected for PDP calculations.`;
    }
    return caption;
  });


  const blockTargetsSelectionUpdates = function(f) {
    _isUpdatingTargetsSelectionCount = true;
    f();
    return _isUpdatingTargetsSelectionCount = false;
  };

  const incrementTargetsSelectionCount = amount => _targetsSelectionCount(_targetsSelectionCount() + amount);

  const _hasFilteredTargets = lift(_targets, entries => entries.length > 0);

  const filterTargets = function() {
    const searchTermTargets = _searchTermTargets().trim();

    const filteredTargets = [];

    const iterable = _targets();
    for (let i = 0; i < iterable.length; i++) {
      const entry = iterable[i];
      let hide = false;
      if ((searchTermTargets !== '') && (-1 === entry.value.toLowerCase().indexOf(searchTermTargets.toLowerCase()))) {
        hide = true;
      }

      if (!hide) {
        filteredTargets.push(entry);
      }
    }

    _filteredTargets(filteredTargets);

    const start = _currentTargetsPage() * MaxItemsPerPage;
    return _visibleTargets(_filteredTargets().slice(start, start + MaxItemsPerPage));
  };

  // when searchTermTargets changes, filterTargets is called
  react(_searchTermTargets, throttle(filterTargets, 500));

  const _selectFilteredTargets = function() {
    const entries = _filteredTargets();
    blockTargetsSelectionUpdates(() => changeSelection(entries, true));
    return _targetsSelectionCount(entries.length);
  };

  const _deselectFilteredTargets = function() {
    blockTargetsSelectionUpdates(() => changeSelection(_targets(), false));
    return _targetsSelectionCount(0);
  };

  const _goToPreviousTargetsPage = function() {
    if (_canGoToPreviousTargetsPage()) {
      _currentTargetsPage(_currentTargetsPage() - 1);
      filterTargets();
    }
  };

  const _goToNextTargetsPage = function() {
    if (_canGoToNextTargetsPage()) {
      _currentTargetsPage(_currentTargetsPage() + 1);
      filterTargets();
    }
  };

  const _selectedTargetsToString = function() {
    let res = "";
    const targets = _targets();
    if (targets !== null) {
      for (let t of Array.from(targets)) {
        if (t.isSelected()) {
          res = res + "\"" + t.value + "\",";
        }
      }
      if (res !== "") {
        res ="[" + res + "]";
      }
    }
    return res;
  };
  // end of search & filter targets

  const _addColumns2d = function() {
    const vals = _columns2d();
    const entry = {
      firstColumn: _columnValues()[0],
      secondColumn: _columnValues()[0],
      columnValues: _columnValues
    };
    const _removeSelf = () => _columns2d(_columns2d().filter(it => it !== entry));
    entry.removeSelf = _removeSelf;
    vals.push(entry);
    return _columns2d(vals);
  };

  const _cols2dToString = function() {
    let cols = "";
    for (let col of Array.from(_columns2d())) {
      cols = cols + "[\"" + col.firstColumn + "\",\"" + col.secondColumn + "\"], ";
    }
    if (cols !== "") {
      cols ="[" + cols + "]";
    }
    return cols;
  };

  // a conditional check that makes sure that
  // all fields in the form are filled in
  // before the button is shown as active
  const _canCompute = lift(_destinationKey, _selectedFrame, _selectedModel, _nbins, _row_index, _targets, (dk, sf, sm, nb, ri) => dk && sf && sm && nb && ri);

  const _compute = function() {
    if (!_canCompute()) { return; }

    const opts = {
      destination_key: _destinationKey(),
      model_id: _selectedModel(),
      frame_id: _selectedFrame(),
      cols: _selectedColsToString(),
      targets: _selectedTargetsToString(),
      col_pairs_2dpdp: _cols2dToString(),
      nbins: _nbins(),
      row_index: _row_index()
    };

    // assemble a string for the h2o Rapids AST
    // this contains the function to call
    // along with the options to pass in
    const cs = `buildPartialDependence ${stringify(opts)}`;

    // insert a cell with the expression `cs`
    // into the current Flow notebook
    // and run the cell
    return _.insertAndExecuteCell('cs', cs);
  };

  const _updateColumns = function() {
      const frameKey = _selectedFrame();
      if (frameKey) {
        return _.requestFrameSummaryWithoutData(frameKey, function(error, frame) {
          if (!error) {
            const columnValues = map(frame.columns, column => column.label);
            const columnLabels = map(frame.columns, function(column) {
              const missingPercent = (100 * column.missing_count) / frame.rows;
              const isSelected = signal(false);
              react(isSelected, function(isSelected) {
                if (!_isUpdatingColumnsSelectionCount) {
                  if (isSelected) {
                    incrementColumnsSelectionCount(1);
                  } else {
                    incrementColumnsSelectionCount(-1);
                  }
                }
              });

              return {
                isSelected,
                type: column.type === 'enum' ? `enum(${column.domain_cardinality})` : column.type,
                value: column.label,
                missingPercent,
                missingLabel: missingPercent === 0 ? '' : `${Math.round(missingPercent)}% NA`
              };
            });

            _columns(columnLabels);
            _columnValues(columnValues);

            //reset filtered views
            _currentColumnsPage(0);
            _searchTermColumns('');
            return filterColumns();
          }
        });
      } else {
        return _columns2d([]);
      }
    };

  const _updateTargets = function() {
    const modelKey = _selectedModel();
    if (modelKey) {
      return _.requestModel(modelKey, function(error, model) {
        if (!error) {
          const responseDomain = model.output.domains[model.output.domains.length-1];
          _useCustomTargets((responseDomain !== null) && (responseDomain.length > 2));
          if (_useCustomTargets()) {
            const targetValues = map(responseDomain, function(value) {
              const isSelected = signal(false);
              react(isSelected, function(isSelected) {
                if (!_isUpdatingTargetsSelectionCount) {
                  if (isSelected) {
                    incrementTargetsSelectionCount(1);
                  } else {
                    incrementTargetsSelectionCount(-1);
                  }
                }
              });

              return {
                isSelected,
                value
              };
            });

            _targets(targetValues);

            //reset filtered views
            _currentTargetsPage(0);
            _searchTermTargets('');
            return filterTargets();
          } else {
            return _targets(null);
          }
        }
      });
    }
  };

  _.requestFrames(function(error, frames) {
    if (error) {
      return _exception(new FlowError('Error fetching frame list.', error));
    } else {
      return _frames((Array.from(frames).filter((frame) => !frame.is_text).map((frame) => frame.frame_id.name)));
    }
  });

  _.requestModels(function(error, models) {
    if (error) {
      return _exception(new FlowError('Error fetching model list.', error));
    } else {
      return _models((Array.from(models).map((model) => model.model_id.name)));
    }
  });


  defer(_go);

  return {
    exception:_exception,
    destinationKey: _destinationKey,
    frames: _frames,
    models: _models,
    selectedModel: _selectedModel,
    selectedFrame: _selectedFrame,
    columns: _columns,
    visibleColumns: _visibleColumns,
    useCustomColumns: _useCustomColumns,
    targets: _targets,
    useCustomTargets: _useCustomTargets,
    visibleTargets: _visibleTargets,
    columnValues: _columnValues,
    colums2d: _columns2d,
    nbins: _nbins,
    row_index: _row_index,
    compute: _compute,
    updateColumns: _updateColumns,
    updateTargets: _updateTargets,
    canCompute: _canCompute,

    // add&remove functionality of columns2d
    addColumns2d: _addColumns2d,

    // search & filter functionalities of column selector
    hasFilteredColumns: _hasFilteredColumns,
    selectFilteredColumns: _selectFilteredColumns,
    deselectFilteredColumns: _deselectFilteredColumns,
    goToPreviousColumnsPage: _goToPreviousColumnsPage,
    goToNextColumnsPage: _goToNextColumnsPage,
    canGoToPreviousColumnsPage: _canGoToPreviousColumnsPage,
    canGoToNextColumnsPage: _canGoToNextColumnsPage,
    searchTermColumns: _searchTermColumns,
    searchColumnsCaption: _searchColumnsCaption,

    // search & filter functionalities of targets selector
    hasFilteredTargets: _hasFilteredTargets,
    selectFilteredTargets: _selectFilteredTargets,
    deselectFilteredTargets: _deselectFilteredTargets,
    goToPreviousTargetsPage: _goToPreviousTargetsPage,
    goToNextTargetsPage: _goToNextTargetsPage,
    canGoToPreviousTargetsPage: _canGoToPreviousTargetsPage,
    canGoToNextTargetsPage: _canGoToNextTargetsPage,
    searchTermTargets: _searchTermTargets,
    searchTargetsCaption: _searchTargetsCaption,


    template: 'flow-partial-dependence-input'
  };
};
