/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { uniqueId, escape } = require('lodash');

const { act, react, lift, merge, isSignal, signal, signals } = require("../../core/modules/dataflow");
const { stringify } = require('../../core/modules/prelude');
const util = require('../modules/util');
const failure = require('./failure');

module.exports = function(_, _renderers, type, input) {
  let self;
  if (type == null) { type = 'cs'; }
  if (input == null) { input = ''; }
  const _guid = uniqueId();
  const _type = signal(type);
  const _render = lift(_type, type => _renderers[type](_guid));
  const _isCode = lift(_render, render => render.isCode);
  const _isSelected = signal(false);
  const _isActive = signal(false);
  const _hasError = signal(false);
  const _isBusy = signal(false);
  const _isReady = lift(_isBusy, isBusy => !isBusy);
  const _time = signal('');
  const _hasInput = signal(true);
  const _input = signal(input);
  const _outputs = signals([]);
  const _errors = []; // Only for headless use.
  const _result = signal(null);
  const _hasOutput = lift(_outputs, outputs => outputs.length > 0);
  const _isInputVisible = signal(true);
  const _isOutputHidden = signal(false);

  // This is a shim for ko binding handlers to attach methods to
  // The ko 'cursorPosition' custom binding attaches a getCursorPosition() method to this.
  // The ko 'autoResize' custom binding attaches an autoResize() method to this.
  const _actions = {};

  // select and display input when activated
  act(_isActive, function(isActive) {
    if (isActive) {
      _.selectCell(self);
      _hasInput(true);
      if (!_isCode()) { _outputs([]); }
    }
  });

  // deactivate when deselected
  act(_isSelected, function(isSelected) {
    if (!isSelected) { return _isActive(false); }
  });

  // tied to mouse-clicks on the cell
  const select = function() {
    _.selectCell(self, false); // pass scrollIntoView=no, otherwise mouse actions like clicking on a form field will cause scrolling.
    return true; // Explicity return true, otherwise KO will prevent the mouseclick event from bubbling up
  };

  // tied to mouse-clicks in the outline view
  const navigate = function() {
    _.selectCell(self);
    return true; // Explicity return true, otherwise KO will prevent the mouseclick event from bubbling up
  };


  // tied to mouse-double-clicks on html content
  // TODO
  const activate = () => _isActive(true);

  const clip = () => _.saveClip('user', _type(), _input());

  const toggleInput = () => _isInputVisible(!_isInputVisible());

  const toggleOutput = () => _isOutputHidden(!_isOutputHidden());

  const clear = function() {
    _result(null);
    _outputs([]);
    _errors.length = 0; // Only for headless use
    _hasError(false);
    if (!_isCode()) { return _hasInput(true); }
  };

  const execute = function(go) {
    const startTime = Date.now();
    _time(`Started at ${util.formatClockTime(startTime)}`);
    input = _input().trim();
    if (!input) {
      if (go) { return go(null); } else { return undefined; } 
    }

    const render = _render();
    _isBusy(true);

    clear();

    if (_type() === 'sca') {
      // escape backslashes
      input = input.replace(/\\/g,'\\\\');
      // escape quotes
      input = input.replace(/'/g,'\\\'');
      // escape new-lines
      input = input.replace(/\n/g, '\\n');
      // pass the cell body as an argument, representing the scala code, to the appropriate function
      input = 'runScalaCode ' + _.scalaIntpId() + ', ' + _.scalaIntpAsync() + ', \'' + input + '\'';
    }

    render(input, {
      data(result) {
        return _outputs.push(result);
      },
      close(result) {
        //XXX push to cell output
        return _result(result);
      },
      error(error) {
        _hasError(true);
        //XXX review
        console.debug(error.cause);
        if (error.name === 'FlowError') {
          _outputs.push(failure(_, error));
        } else {
          _outputs.push({
            text: stringify(error, null, 2),
            template: 'flow-raw'
          });
        }
        return _errors.push(error);
      }, // Only for headless use
      end() {
        _hasInput(_isCode());
        _isBusy(false);
        _time(util.formatElapsedTime(Date.now() - startTime));
        if (go) {
          go(_hasError() ? _errors.slice(0) : null);
        }
      }
    }
    );

    return _isActive(false);
  };

  return self = {
    guid: _guid,
    type: _type,
    isCode: _isCode,
    isSelected: _isSelected,
    isActive: _isActive,
    hasError: _hasError,
    isBusy: _isBusy,
    isReady: _isReady,
    time: _time,
    input: _input,
    hasInput: _hasInput,
    outputs: _outputs,
    result: _result,
    hasOutput: _hasOutput,
    isInputVisible: _isInputVisible,
    toggleInput,
    isOutputHidden: _isOutputHidden,
    toggleOutput,
    select,
    navigate,
    activate,
    execute,
    clear,
    clip,
    _actions,
    getCursorPosition() { return _actions.getCursorPosition(); },
    autoResize() { return _actions.autoResize(); },
    scrollIntoView(immediate) { return _actions.scrollIntoView(immediate); },
    templateOf(view) { return view.template; },
    template: 'flow-cell'
  };
};

