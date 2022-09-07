/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { lift, link, signal, signals } = require("../modules/dataflow");

const outline = require('./outline');
const browser = require('./browser');
const clipboard = require('./clipboard');
const help = require('./help');

exports.init = function(_, cells) {
  const _mode = signal('help');

  const _outline = outline.init(_, cells);
  const _isOutlineMode = lift(_mode, mode => mode === 'outline');
  const switchToOutline = () => _mode('outline');

  const _browser = browser.init(_);
  const _isBrowserMode = lift(_mode, mode => mode === 'browser');
  const switchToBrowser = () => _mode('browser');

  const _clipboard = clipboard.init(_);
  const _isClipboardMode = lift(_mode, mode => mode === 'clipboard');
  const switchToClipboard = () => _mode('clipboard');

  const _help = help.init(_);
  const _isHelpMode = lift(_mode, mode => mode === 'help');
  const switchToHelp = () => _mode('help');

  link(_.ready, function() {
    link(_.showHelp, () => switchToHelp());

    link(_.showClipboard, () => switchToClipboard());

    link(_.showBrowser, () => switchToBrowser());

    return link(_.showOutline, () => switchToOutline());
  });

  return {
    outline: _outline,
    isOutlineMode: _isOutlineMode,
    switchToOutline,
    browser: _browser,
    isBrowserMode: _isBrowserMode,
    switchToBrowser,
    clipboard: _clipboard,
    isClipboardMode: _isClipboardMode,
    switchToClipboard,
    help: _help,
    isHelpMode: _isHelpMode,
    switchToHelp
  };
};
