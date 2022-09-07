/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { act, react, lift, merge, isSignal, signal, signals } = require("../../core/modules/dataflow");
const { isString, isArray, isFunction, noop, uniqueId } = require('lodash');
const { isNumber } = require('./prelude');

const wrapValue = function(value, init) {
  if (value === undefined) {
    return signal(init);
  } else {
    if (isSignal(value)) {
      return value;
    } else {
      return signal(value);
    }
  }
};

const wrapArray = function(elements) {
  if (elements) {
    if (isSignal(elements)) {
      const element = elements();
      if (isArray(element)) { return elements; } else { return signal([ element ]); }
    } else {
      return signals(isArray(elements) ? elements : [ elements ]);
    }
  } else {
    return signals([]);
  }
};

const control = function(type, opts) {
  if (!opts) { opts = {}; }
  const guid = `gui_${uniqueId()}`;

  return {
    type,
    id: opts.id || guid,
    label: signal(opts.label || ' '),
    description: signal(opts.description || ' '),
    visible: signal(opts.visible === false ? false : true),
    disable: signal(opts.disable === true ? true : false),
    template: `flow-form-${type}`,
    templateOf(control) { return control.template; }
  };
};

const content = function(type, opts) {
  const self = control(type, opts);
  self.value = wrapValue(opts.value, '');
  return self;
};

const text = opts => content('text', opts);

const html = opts => content('html', opts);

const markdown = opts => content('markdown', opts);

const checkbox = function(opts) {
  const self = control('checkbox', opts);
  self.value = wrapValue(opts.value, opts.value ? true : false);
  return self;
};

//TODO KO supports array valued args for 'checked' - can provide a checkboxes function

const dropdown = function(opts) {
  const self = control('dropdown', opts);
  self.options = opts.options || [];
  self.value = wrapValue(opts.value);
  self.caption = opts.caption || 'Choose...';
  return self;
};

const listbox = function(opts) {
  const self = control('listbox', opts);
  self.options = opts.options || [];
  self.values = wrapArray(opts.values);
  return self;
};

const textbox = function(opts) {
  const self = control('textbox', opts);
  self.value = wrapValue(opts.value, '');
  self.event = isString(opts.event) ? opts.event : null;
  return self;
};

const textarea = function(opts) {
  const self = control('textarea', opts);
  self.value = wrapValue(opts.value, '');
  self.event = isString(opts.event) ? opts.event : null;
  self.rows = isNumber(opts.rows) ? opts.rows : 5;
  return self;
};

const button = function(opts) {
  const self = control('button', opts);
  self.click = isFunction(opts.click) ? opts.click : noop;
  return self;
};

module.exports = {
  text,
  html,
  markdown,
  checkbox,
  dropdown,
  listbox,
  textbox,
  textarea,
  button
};
