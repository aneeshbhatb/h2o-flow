/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const growl = require("./growl");
const analytics = require('./analytics');
const autosave = require("./autosave");
const routines = require("./../../ext/modules/routines");
const sandbox = require('./sandbox');
const notebook = require('../components/notebook');
const renderers = require('./renderers');

exports.init = function(_) {
  const _sandbox = sandbox(_, routines.init(_));
  //TODO support external renderers
  const _renderers = renderers.init(_, _sandbox);
  // analytics _
  growl.init(_);
  autosave.init(_);
  const _notebook = notebook.init(_, _renderers);

  return {
    context: _,
    sandbox: _sandbox,
    view: _notebook,
    async: require('./async')
  };
};
