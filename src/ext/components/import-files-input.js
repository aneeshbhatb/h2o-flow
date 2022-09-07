/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { defer, map, some, throttle } = require('lodash');

const { stringify } = require('../../core/modules/prelude');
const { act, react, lift, link, signal, signals } = require("../../core/modules/dataflow");
const util = require('../../core/modules/util');

module.exports = function(_, _go) {
  //
  // Search files/dirs
  //
  const _specifiedPath = signal('');
  const _exception = signal('');
  const _hasErrorMessage = lift(_exception, function(exception) { if (exception) { return true; } else { return false; } });

  const tryImportFiles = function() {
    const specifiedPath = _specifiedPath();
    if (specifiedPath.trim().length === 0) {
      return _exception('Empty path. Please provide a valid path.');
    } else {
      return _.requestFileGlob(specifiedPath, -1, function(error, result) {
        if (error) {
          return _exception(error.stack);
        } else {
          _exception('');
          //_go 'confirm', result
          return processImportResult(result);
        }
      });
    }
  };

  //
  // File selection 
  //
  const _importedFiles = signals([]);
  const _importedFileCount = lift(_importedFiles, function(files) { if (files.length) { return `Found ${util.describeCount(files.length, 'file')}:`; } else { return ''; } });
  const _hasImportedFiles = lift(_importedFiles, files => files.length > 0);
  const _hasUnselectedFiles = lift(_importedFiles, files => some(files, file => !file.isSelected()));
  const _selectedFiles = signals([]);
  const _selectedFilesDictionary = lift(_selectedFiles, function(files) {
    const dictionary = {};
    for (let file of Array.from(files)) {
      dictionary[file.path] = true;
    }
    return dictionary;
  });
  const _selectedFileCount = lift(_selectedFiles, function(files) { 
    if (files.length) {
      return `${util.describeCount(files.length, 'file')} selected:`;
    } else {
      return "(No files selected)";
    }
  });

  const _hasSelectedFiles = lift(_selectedFiles, files => files.length > 0);

  const importFiles = function(files) {
    const paths = map(files, file => stringify(file.path));
    return _.insertAndExecuteCell('cs', `importFiles [ ${ paths.join(',') } ]`);
  };

  const importSelectedFiles = () => importFiles(_selectedFiles());

  const createSelectedFileItem = function(path) {
    let self;
    return self = {
      path,
      deselect() {
        _selectedFiles.remove(self);
        for (let file of Array.from(_importedFiles())) {
          if (file.path === path) {
            file.isSelected(false);
          }
        }
      }
    };
  };

  const createFileItem = function(path, isSelected) {
    var self = {
      path,
      isSelected: signal(isSelected),
      select() {
        _selectedFiles.push(createSelectedFileItem(self.path));
        return self.isSelected(true);
      } 
    };

    act(self.isSelected, isSelected => _hasUnselectedFiles(some(_importedFiles(), file => !file.isSelected())));

    return self;
  };

  const createFileItems = result => map(result.matches, path => createFileItem(path, _selectedFilesDictionary()[path]));

  const listPathHints = (query, sync, process) => _.requestFileGlob(query, 10, function(error, result) {
    if (!error) {
      return process(map(result.matches, value => ({
        value
      })));
    }
  });

  const selectAllFiles = function() {
    let file;
    const dict = {};
    for (file of Array.from(_selectedFiles())) {
      dict[file.path] = true;
    }
    for (file of Array.from(_importedFiles())) {
      if (!dict[file.path]) {
        file.select();
      }
    }
  };

  const deselectAllFiles = function() {
    _selectedFiles([]);
    for (let file of Array.from(_importedFiles())) {
      file.isSelected(false);
    }
  };
  
  var processImportResult = function(result) { 
    const files = createFileItems(result);
    return _importedFiles(files);
  };

  defer(_go);

  return {
    specifiedPath: _specifiedPath,
    hasErrorMessage: _hasErrorMessage, //XXX obsolete
    exception: _exception,
    tryImportFiles,
    listPathHints: throttle(listPathHints, 100),
    hasImportedFiles: _hasImportedFiles,
    importedFiles: _importedFiles,
    importedFileCount: _importedFileCount,
    selectedFiles: _selectedFiles,
    selectAllFiles,
    deselectAllFiles,
    hasUnselectedFiles: _hasUnselectedFiles,
    hasSelectedFiles: _hasSelectedFiles,
    selectedFileCount: _selectedFileCount,
    importSelectedFiles,
    template: 'flow-import-files'
  };
};

