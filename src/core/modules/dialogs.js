/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS201: Simplify complex destructure assignments
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { link, signal, signals } = require("../modules/dataflow");

const confirmDialog = require('../components/confirm-dialog');
const alertDialog = require('../components/alert-dialog');

exports.init = function(_) {
  const _dialog = signal(null);

  const showDialog = function(ctor, args, _go) {
    let dialog;
    let responded = false;
    const go = function(response) {
      if (!responded) {
        responded = true;
        $dialog.modal('hide');
        if (_go) { return _go(response); }
      }
    };

    _dialog(dialog = ctor.apply(null, [_].concat(args).concat(go)));

    var $dialog = $(`#${dialog.template}`);
    $dialog.modal();
    $dialog.on('hidden.bs.modal', function(e) {
      if (!responded) {
        responded = true;
        _dialog(null);
        if (_go) { return _go(null); }
      }
    });
  };

  link(_.dialog, function(ctor, ...rest) {
    const adjustedLength = Math.max(rest.length, 1), args = rest.slice(0, adjustedLength - 1), go = rest[adjustedLength - 1];
    return showDialog(ctor, args, go);
  });

  link(_.confirm, (message, opts, go) => showDialog(confirmDialog, [ message, opts ], go));

  link(_.alert, (message, opts, go) => showDialog(alertDialog, [ message, opts ], go));

  return {
    dialog: _dialog,
    template(dialog) { return 'flow-' + dialog.template; }
  };
};
