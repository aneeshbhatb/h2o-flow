/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { flatten, compact, defer, map } = require('lodash');

const { stringify } = require('../../core/modules/prelude');
const { react, lift, link, signal, signals } = require("../../core/modules/dataflow");

module.exports = function(_, _go, _importResults) {
  const _allFrames = flatten(compact(map(_importResults, result => result.destination_frames)));
  const _canParse = _allFrames.length > 0;
  const _title = `${_allFrames.length} / ${_importResults.length} files imported.`;

  const createImportView = result => //TODO dels?
  //TODO fails?

  ({
    files: result.files,
    template: 'flow-import-file-output'
  });

  const _importViews = map(_importResults, createImportView);

  const parse = function() {
    const paths = map(_allFrames, stringify);
    return _.insertAndExecuteCell('cs', `setupParse source_frames: [ ${paths.join(',')} ]`);
  };

  defer(_go);

  return {
    title: _title,
    importViews: _importViews,
    canParse: _canParse,
    parse,
    template: 'flow-import-files-output',
    templateOf(view) { return view.template; }
  };
};

