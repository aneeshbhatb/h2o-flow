/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS104: Avoid inline assignments
 * DS204: Change includes calls to have a more natural evaluation order
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { defer, filter, find, flatten, forEach, groupBy, map, throttle, uniqueId } = require('lodash');
const { act, lift, merge, react, signal, signals, unlink } = require("../../core/modules/dataflow");

const columnLabelsFromFrame = function(frame) {
  const columnLabels = map(frame.columns, function(column) {
    const missingPercent = (100 * column.missing_count) / frame.rows;

    return {
      type: column.type === 'enum' ? `enum(${column.domain_cardinality})` : column.type,
      value: column.label,
      missingPercent,
      missingLabel: missingPercent === 0 ? '' : `${Math.round(missingPercent)}% NA`
    };
  });
  return columnLabels;
};


const createControl = function(kind, parameter) {
  const _hasError = signal(false);
  const _hasWarning = signal(false);
  const _hasInfo = signal(false);
  const _message = signal('');
  const _hasMessage = lift(_message, function(message) { if (message) { return true; } else { return false; } });
  const _isVisible = signal(true);
  const _isGrided = signal(false);
  const _isNotGrided = lift(_isGrided, value => !value);

  return {
    kind,
    name: parameter.name,
    label: parameter.label,
    description: parameter.help,
    isRequired: parameter.required,
    hasError: _hasError,
    hasWarning: _hasWarning,
    hasInfo: _hasInfo,
    message: _message,
    hasMessage: _hasMessage,
    isVisible: _isVisible,
    isGridable: parameter.gridable,
    isGrided: _isGrided,
    isNotGrided: _isNotGrided
  };
};


const createTextboxControl = function(parameter, type) {
  let isInt, isReal;
  let isArrayValued = (isInt = (isReal = false));

  switch (type) {
    case 'byte[]': case 'short[]': case 'int[]': case 'long[]':
      isArrayValued = true;
      isInt = true;
      break;
    case 'float[]': case 'double[]':
      isArrayValued = true;
      isReal = true;
      break;
    case 'byte': case 'short': case 'int': case 'long':
      isInt = true;
      break;
    case 'float': case 'double':
      isReal = true;
      break;
  }

  const _text = signal(isArrayValued ? (parameter.value != null ? parameter.value : []).join(', ') : (parameter.value != null ? parameter.value : ''));

  const _textGrided = signal(_text() + ';');

  const textToValue = function(text) {
    let parsed;
    if (isInt) {
      if (!isNaN(parsed = parseInt(text, 10))) {
        return parsed;
      }
    } else if (isReal) {
      if (!isNaN(parsed = parseFloat(text))) {
        return parsed;
      }
    } else {
      if (text === '') { return null; } else { return text; }
    }
  };

  const textToValues = function(text) {
    if (isArrayValued) {
      const vals = [];
      for (let value of Array.from(text.split(/\s*,\s*/g))) {
        const v = textToValue(value);
        if (v != null) {
          vals.push(v);
        }
      }
      return vals;
    } else {
      return textToValue(text);
    }
  };

  const _value = lift(_text, textToValues);

  const _valueGrided = lift(_textGrided, function(text) {
    const values = [];
    for (let part of Array.from(`${text}`.split(/\s*;\s*/g))) {
      var token;
      if (token = part.trim()) {
        values.push(textToValues(token));
      }
    }
    return values;
  });

  const control = createControl('textbox', parameter);
  control.text = _text;
  control.textGrided = _textGrided;
  control.value = _value;
  control.valueGrided = _valueGrided;
  control.isArrayValued = isArrayValued;
  return control;
};


const createDropdownControl = function(parameter) {
  const _value = signal(parameter.value);
  const _values = signals(parameter.values);
  const _valueGrided = signal(null);
  const _choices = signal([]);

  let arrows = null;

  act(_values, function(values) {
    let c;
    const choices = map(values, v => ({
      label: v,
      value: signal(true)
    }));
    _choices(choices);
    if (arrows) {
      unlink(arrows);
    }
    const vs = ((() => {
      const result = [];
      for (c of Array.from(choices)) {         result.push(c.value);
      }
      return result;
    })());
    const readValue =  () => (() => {
      const result1 = [];
      for (c of Array.from(choices)) {           if (c.value()) {
          result1.push(c.label);
        }
      }
      return result1;
    })();
    return arrows = merge(...Array.from(vs), _valueGrided, readValue);
  });

  const control = createControl('dropdown', parameter);
  control.values = _values;
  control.value = _value;
  control.valueGrided = _valueGrided;
  control.choices = _choices;
  return control;
};


const createCheckboxControl = function(parameter) {
  const _value = signal(parameter.value != null ? parameter.value : false);

  const control = createControl('checkbox', parameter);
  control.clientId = uniqueId();
  control.value = _value;
  control.valueGrided = signal([true, false]);
  return control;
};


const createListControl = function(parameter) {
  const MaxItemsPerPage = 10;
  const _searchTerm = signal('');
  const _ignoreNATerm = signal('');

  const _values = signals(parameter.values);
  const _value = signal(parameter.value ? ((() => {
    const result = [];
    for (let v of Array.from(parameter.value)) {       var needle;
    if ((needle = v, Array.from(_values()).includes(needle))) {
        result.push(v);
      }
    }
    return result;
  })()) : []);

  const _selectionCount = signal(0);

  let _isUpdatingSelectionCount = false;
  const blockSelectionUpdates = function(f) {
    _isUpdatingSelectionCount = true;
    f();
    return _isUpdatingSelectionCount = false;
  };

  const incrementSelectionCount = amount => _selectionCount(_selectionCount() + amount);

  const createEntry = function(value) {
    let needle1;
    const val = typeof value === 'string' ? value : value.value;
    const isSelected = signal((needle1 = val, Array.from(_value()).includes(needle1)));
    act(isSelected, function(isSelected) {
      if (!_isUpdatingSelectionCount) {
        if (isSelected) {
          incrementSelectionCount(1);
        } else {
          incrementSelectionCount(-1);
        }
      }
    });

    return {
      isSelected,
      value: val,
      type: value.type,
      missingLabel: value.missingLabel,
      missingPercent: value.missingPercent
    };
  };

  const _entries = lift(_values, values => map(values, createEntry));
  const _filteredItems = signal([]);
  const _visibleItems = signal([]);
  const _hasFilteredItems = lift(_filteredItems, entries => entries.length > 0);
  const _columnsFilterEnabled = signal(parameter.type !== 'enum[]');
  const _paginationEnabled =  lift(_filteredItems, entries => entries.length > MaxItemsPerPage);
  const _currentPage = signal(0);
  const _maxPages = lift(_filteredItems, entries => Math.ceil(entries.length / MaxItemsPerPage));
  const _canGoToPreviousPage = lift(_currentPage, index => index > 0);
  const _canGoToNextPage = lift(_maxPages, _currentPage, (maxPages, index) => index < (maxPages - 1));

  const _searchCaption = lift(_entries, _filteredItems, _selectionCount, _currentPage, _maxPages, function(entries, filteredItems, selectionCount, currentPage, maxPages) {
    let caption = maxPages === 0 ? '' : `Showing page ${currentPage + 1} of ${maxPages}.`;
    if (filteredItems.length !== entries.length) {
      caption += ` Filtered ${filteredItems.length} of ${entries.length}.`;
    }
    if (selectionCount !== 0) {
      caption += ` ${selectionCount} ignored.`;
    }
    return caption;
  });

  let _lastUsedSearchTerm = null;
  let _lastUsedIgnoreNaTerm = null;

  const filterItems = function(force) {
    if (force == null) { force = false; }
    const searchTerm = _searchTerm().trim();
    const ignoreNATerm = _ignoreNATerm().trim();

    if (force || (searchTerm !== _lastUsedSearchTerm) || (ignoreNATerm !== _lastUsedIgnoreNaTerm)) {
      const filteredItems = [];
      const iterable = _entries();
      for (let i = 0; i < iterable.length; i++) {
        const entry = iterable[i];
        const missingPercent = parseFloat(ignoreNATerm);
        let hide = false;
        if ((searchTerm !== '') && (-1 === entry.value.toLowerCase().indexOf(searchTerm.toLowerCase()))) {
          hide = true;
        } else if ((!isNaN(missingPercent)) && (missingPercent !== 0) && (entry.missingPercent <= missingPercent)) {
          hide = true;
        }

        if (!hide) {
          filteredItems.push(entry);
        }
      }

      _lastUsedSearchTerm = searchTerm;
      _lastUsedIgnoreNaTerm = ignoreNATerm;
      _currentPage(0);
      _filteredItems(filteredItems);
    }

    const start = _currentPage() * MaxItemsPerPage;
    _visibleItems(_filteredItems().slice(start, start + MaxItemsPerPage));
  };

  const changeSelection = function(source, value) {
    for (let entry of Array.from(source)) {
      entry.isSelected(value);
    }
  };

  const selectFiltered = function() {
    const entries = _filteredItems();
    blockSelectionUpdates(() => changeSelection(entries, true));
    return _selectionCount(entries.length);
  };

  const deselectFiltered = function() {
    blockSelectionUpdates(() => changeSelection(_filteredItems(), false));
    return _selectionCount(0);
  };

  const goToPreviousPage = function() {
    if (_canGoToPreviousPage()) {
      _currentPage(_currentPage() - 1);
      filterItems();
    }
  };

  const goToNextPage = function() {
    if (_canGoToNextPage()) {
      _currentPage(_currentPage() + 1);
      filterItems();
    }
  };

  const control = createControl('list', parameter);
  let arrows = null;
  act(_entries, function(entries) {
      filterItems(true);
      control.isVisible(entries.length > 0);
      if (arrows) {
        unlink(arrows);
      }
      const selections = (Array.from(entries).map((s) => s.isSelected));
      const readValue = () => (() => {
        const result1 = [];
        for (let e of Array.from(entries)) {             if (e.isSelected()) {
            result1.push(e.value);
          }
        }
        return result1;
      })();
      return arrows = merge(...Array.from(selections), _value, readValue);
  });

  react(_searchTerm, throttle(filterItems, 500));
  react(_ignoreNATerm, throttle(filterItems, 500));

  control.values = _values;
  control.entries = _visibleItems;
  control.hasFilteredItems = _hasFilteredItems;
  control.searchCaption = _searchCaption;
  control.searchTerm = _searchTerm;
  control.ignoreNATerm = _ignoreNATerm;
  control.value = _value;
  control.selectFiltered = selectFiltered;
  control.deselectFiltered = deselectFiltered;
  control.paginationEnabled = _paginationEnabled;
  control.previousLabel = 'Previous #{MaxItemsPerPage}';
  control.nextLabel = 'Next #{MaxItemsPerPage}';
  control.goToPreviousPage = goToPreviousPage;
  control.goToNextPage = goToNextPage;
  control.canGoToPreviousPage = _canGoToPreviousPage;
  control.canGoToNextPage = _canGoToNextPage;
  control.columnsFilterEnabled = _columnsFilterEnabled;
  return control;
};


const createModelsControl = function(_, parameter) {
  const _models = signal([]);
  const _frames = signal([]);
  const _selectedFrame = signal(null);
  const _checkAllModels = signal(false);

  _.requestFrames(function(error, frames) {
    if (!error) {
      return _frames((Array.from(frames).map((frame) => frame.frame_id.name)));
    }
  });

  const createModelItem = function(modelKey) {
    const _isSelected = signal(false);

    return {
      value: modelKey,
      isSelected: _isSelected
    };
  };

  const createModelItems = (error, frame) => _models(map(frame.compatible_models, createModelItem));

  let _isCheckingAll = false;
  lift(_checkAllModels, function(checkAll) {
    _isCheckingAll = true;
    for (let view of Array.from(_models())) {
      view.isSelected(checkAll);
    }
    _isCheckingAll = false;
  });

  const selectFiltered = function() {
    const entries = _models();
    return blockSelectionUpdates(() => changeSelection(entries, true));
  };

  const deselectFiltered = function() {
    const entries = _models();
    return blockSelectionUpdates(() => changeSelection(entries, false));
  };

  lift(_selectedFrame, function(frameKey) {
    if (frameKey) {
      return _.requestFrame(frameKey, createModelItems, {find_compatible_models: true});
    }
  });

  const control = createControl('models', parameter);
  control.clientId = uniqueId();
  control.frames = _frames;
  control.selectedFrame = _selectedFrame;
  control.checkAllModels = _checkAllModels;
  control.value = _models;
  control.defaultValue = [];
  return control;
};


const createStringPairsControl = function(parameter) {
  const _pairs = signal([]);
  const _columns = signal([]);

  react(_columns, () => _pairs([]));

  const pairEquals = (pair, leftValue, rightValue) => ((pair.leftColumn() === leftValue) && (pair.rightColumn() === rightValue)) || ((pair.rightColumn() === leftValue) && (pair.leftColumn() === rightValue));

  const pairExists = function(leftValue, rightValue) {
    const samePairs = ((() => {
      const result = [];
      for (let pair of Array.from(_pairs())) {         if (pairEquals(pair, leftValue, rightValue)) {
          result.push(pair);
        }
      }
      return result;
    })());
    return samePairs.length !== 0;
  };

  const _stringPair = function(leftValue, rightValue) {
    const _leftColumn = signal(leftValue);
    const _rightColumn = signal(rightValue);
    const _id = signal(uniqueId());

    return {
      leftColumn: _leftColumn,
      rightColumn: _rightColumn,
      id: _id,
      remove() {
        return _pairs(((() => {
          const result = [];
          for (let entry of Array.from(_pairs())) {             if (entry.id() !== _id()) {
              result.push(entry);
            }
          }
          return result;
        })()));
      }
    };
  };

  const _pairConstructor = function() {
    const _leftColumn = signal('');
    const _leftColumns = signal(_columns());
    const _leftSelected = signal(false);

    const _rightColumn = signal('');
    const _rightColumns = signal([]);

    const _calculateRightColumns = () => _rightColumns(((() => {
      const result = [];
      for (let entry of Array.from(_leftColumns())) {           if ((entry !== _leftColumn()) && !pairExists(_leftColumn(), entry)) {
          result.push(entry);
        }
      }
      return result;
    })()));

    react(_leftColumn, function(leftColumn) {
      if (leftColumn) {
        _calculateRightColumns();
        return _leftSelected(true);
      } else {
        _rightColumns([]);
        return _leftSelected(false);
      }
    });

    react(_pairs, () => _calculateRightColumns());

    return {
      leftColumn: _leftColumn,
      leftColumns: _leftColumns,
      leftSelected: _leftSelected,
      rightColumn: _rightColumn,
      rightColumns: _rightColumns,
      create() {
        if (!_rightColumn() || !_leftColumn() || pairExists(_leftColumn(), _rightColumn())) {
          return;
        }
        const new_entries = _pairs();
        new_entries.push(_stringPair(_leftColumn(), _rightColumn()));
        return _pairs(new_entries);
      }
    };
  };

  const _pairToValue = function(pairs) {
    const result = [];
    for (let pair of Array.from(pairs)) {
      result.push({a: pair.leftColumn(), b: pair.rightColumn()});
    }
    return result;
  };

  const _value = lift(_pairs, _pairToValue);

  const control = createControl('stringpairs', parameter);
  control.value = _value;
  control.newPair = _pairConstructor;
  control.pairs = _pairs;
  control.columns = _columns;
  return control;
};


const createMonotoneConstraintsControl = function(encodingMap, parameter) {
  let k;
  const _keyValues = signal([]);
  const _columns = signal([]);

  const options = ((() => {
    const result = [];
    for (k of Array.from(Object.keys(encodingMap))) {       if (k !== '_') {
        result.push(k);
      }
    }
    return result;
  })());
  const _value = lift(_keyValues, keyValues => Array.from(keyValues).map((kv) => ({key: kv.key(), value: kv.encodedValue()})));

  const encode = function(opt) {
    if (Array.from(options).includes(opt)) { return encodingMap[opt]; } else { return encodingMap._; }
  };
  const decode = function(val) {
    for (k in encodingMap) {
      const v = encodingMap[k];
      if (v === val) {
        return k;
      }
    }
  };

  const _keyValueObject = function(key, value) {
    const _key = signal(key);
    const _val = signal(value);
    const _id = signal(uniqueId());

    return {
      key: _key,
      value: _val,
      id: _id,
      encodedValue() {
        return encode(_val());
      },
      remove() {
        return _keyValues(((() => {
          const result1 = [];
          for (let entry of Array.from(_keyValues())) {             if (entry.id() !== _id()) {
              result1.push(entry);
            }
          }
          return result1;
        })()));
      }
    };
  };

  const _keyValueConstructor = function() {
    const _key = signal('');
    const _keyOpts = signal(_columns());
    const _keySelected = signal(false);

    const _val = signal('');
    const _valOpts = signal([]);

    react(_key, function(value) {
      if (value) {
        _keySelected(true);
        return _valOpts(options);
      } else {
        _keySelected(false);
        return _valOpts([]);
      }
  });

    const _keyValueExists = function(checkedKey) {
      const sameKeys = ((() => {
        const result1 = [];
        for (let keyValue of Array.from(_keyValues())) {           if (keyValue.key() === checkedKey) {
            result1.push(keyValue);
          }
        }
        return result1;
      })());
      return sameKeys.length !== 0;
    };

    react(_keyValues, function(_) {
      _keyOpts(((() => {
        const result1 = [];
        for (let key of Array.from(_keyOpts())) {           if (!_keyValueExists(key)) {
            result1.push(key);
          }
        }
        return result1;
      })()));
      return _key(null);
    });

    return {
      key: _key,
      keyOpts: _keyOpts,
      keySelected: _keySelected,
      value: _val,
      valueOpts: _valOpts,
      create() {
        if (!_key() || !_val() || _keyValueExists(_key())) {
          return;
        }
        const new_entries = _keyValues();
        new_entries.push(_keyValueObject(_key(), _val()));
        return _keyValues(new_entries);
      }
    };
  };

  react(_columns, function(cols) {
    const kvs = _value();
    const keyValues = [];
    for (let kv of Array.from(kvs)) {
      if (Array.from(cols).includes(kv.key)) {
        const opt = decode(kv.value);
        if (opt != null) {
          keyValues.push(_keyValueObject(kv.key, opt));
        }
      }
    }
    return _keyValues(keyValues);
  });

  const control = createControl('keyvalues', parameter);
  control.value = _value;
  control.columns = _columns;
  control.keyValues = _keyValues;
  control.newKeyValue = _keyValueConstructor;
  return control;
};


const createControlFromParameter = function(_, parameter) {
  switch (parameter.type) {
    case 'enum': case 'Key<Frame>': case 'VecSpecifier':
      return createDropdownControl(parameter);
    case 'string[]': case 'enum[]':
      return createListControl(parameter);
    case 'boolean':
      return createCheckboxControl(parameter);
    case 'Key<Model>': case 'string': case 'byte': case 'short': case 'int': case 'long': case 'float': case 'double': case 'byte[]': case 'short[]': case 'int[]': case 'long[]': case 'float[]': case 'double[]':
      return createTextboxControl(parameter, parameter.type);
    case 'Key<Model>[]':
      return createModelsControl(_, parameter);
    case 'StringPair[]':
      return createStringPairsControl(parameter);
    case 'KeyValue[]':
      if (parameter.name === 'monotone_constraints') {
        const encodingMap = {
          Increasing: 1,
          Decreasing: -1,
          _: 0
        };
        return createMonotoneConstraintsControl(encodingMap, parameter);
      }
      break;
    default:
      console.error('Invalid field', JSON.stringify(parameter, null, 2));
      return null;
  }
};


const ControlGroups = function(_, _parameters) {
  const _parametersByLevel = groupBy(_parameters, parameter => parameter.level);
  const _controlGroups = map([ 'critical', 'secondary', 'expert' ], function(type) {
    let controls = map(_parametersByLevel[type], p => createControlFromParameter(_, p));
    controls = filter(controls, function(a) { if (a) { return true; } else { return false; } });
    return controls;
  });

  const _findControl = name => find((flatten(_controlGroups)), c => c.name === name);

  const _createForm =  function() {
    const form = [];
    const [critical, secondary, expert] = Array.from(_controlGroups);
    const labels =  ['Parameters', 'Advanced', 'Expert'];
    for (let i = 0; i < _controlGroups.length; i++) {
      const controls = _controlGroups[i];
      if (controls.length) {
        const gridEnabled = controls.some(c => c.isGridable);
        form.push({kind: 'group', title: labels[i], grided: gridEnabled});
        for (let control of Array.from(controls)) { form.push(control); }
      }
    }
    return form;
  };

  const _readControlValue = function(control) {
    if (control.isGrided() && control.valueGrided) { return control.valueGrided(); } else { return control.value(); }
  };

  const _validateControl = function(control, validations, checkForErrors) {
    if (checkForErrors == null) { checkForErrors = false; }
    if (validations) {
      return (() => {
        const result = [];
        for (let validation of Array.from(validations)) {
          if (validation.message_type === 'TRACE') {
            result.push(control.isVisible(false));
          } else {
            control.isVisible(true);
            if (checkForErrors) {
              switch (validation.message_type) {
                case 'INFO':
                  control.hasInfo(true);
                  result.push(control.message(validation.message));
                  break;
                case 'WARN':
                  control.hasWarning(true);
                  result.push(control.message(validation.message));
                  break;
                case 'ERRR':
                  control.hasError(true);
                  result.push(control.message(validation.message));
                  break;
                default:
                  result.push(undefined);
              }
            } else {
              result.push(undefined);
            }
          }
        }
        return result;
      })();
    } else {
      control.isVisible(true);
      control.hasInfo(false);
      control.hasWarning(false);
      control.hasError(false);
      return control.message('');
    }
  };

  return {
    createForm: _createForm,
    findControl: _findControl,
    readControlValue: _readControlValue,
    validateControl: _validateControl,
    list: _controlGroups
  };
};


module.exports = {
  ControlGroups,
  columnLabelsFromFrame
};
