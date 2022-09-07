/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { react, lift, link, signal, signals } = require("../../core/modules/dataflow");

const util = require('../modules/util');

module.exports = function(_, _go) {
  const _overwrite = signal(false);
  const _form = signal(null);
  const _file = signal(null);

  const _canAccept = lift(_file, function(file) {
    if ((file != null ? file.name : undefined)) {
      return util.validateFileExtension(file.name, '.flow');
    } else {
      return false;
    }
  });

  const checkIfNameIsInUse = (name, go) => _.requestObjectExists('notebook', name, (error, exists) => go(exists));

  const uploadFile = basename => _.requestUploadObject('notebook', basename, (new FormData(_form())), (error, filename) => _go({error, filename}));

  const accept = function() {
    let file;
    if (file = _file()) {
      const basename = util.getFileBaseName(file.name, '.flow');
      if (_overwrite()) {
        return uploadFile(basename);
      } else {
        return checkIfNameIsInUse(basename, function(isNameInUse) {
          if (isNameInUse) {
            return _overwrite(true);     
          } else {
            return uploadFile(basename);
          }
        });
      }
    }
  };

  const decline = () => _go(null);

  return {
    form: _form,
    file: _file,
    overwrite: _overwrite,
    canAccept: _canAccept,
    accept,
    decline,
    template: 'file-open-dialog'
  };
};
