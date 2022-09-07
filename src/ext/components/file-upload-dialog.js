/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { link, signal, lift } = require("../../core/modules/dataflow");

module.exports = function(_, _go) {
  const _form = signal(null);
  const _file = signal(null);

  const uploadFile = key => _.requestUploadFile(key, (new FormData(_form())), (error, result) => _go({error, result}));

  const accept = function() {
    let file;
    if (file = _file()) {
      return uploadFile(file.name);
    }
  };

  const decline = () => _go(null);

  return {
    form: _form,
    file: _file,
    accept,
    decline,
    template: 'file-upload-dialog'
  };
};
