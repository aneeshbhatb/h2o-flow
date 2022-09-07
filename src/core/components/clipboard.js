/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { map } = require('lodash');

const { lift, link, signal, signals } = require("../modules/dataflow");

const SystemClips = [
  'assist',
  'importFiles',
  'getFrames',
  'getModels',
  'getPredictions',
  'getJobs',
  'buildModel',
  'predict'
];

exports.init = function(_) {
  const lengthOf = function(array) { if (array.length) { return `(${array.length})`; } else { return ''; } };
  const _systemClips = signals([]);
  const _systemClipCount = lift(_systemClips, lengthOf);
  const _userClips = signals([]);
  const _userClipCount = lift(_userClips, lengthOf);
  const _hasUserClips = lift(_userClips, clips => clips.length > 0);
  const _trashClips = signals([]);
  const _trashClipCount = lift(_trashClips, lengthOf);
  const _hasTrashClips = lift(_trashClips, clips => clips.length > 0);

  const createClip = function(_list, _type, _input, _canRemove) {
    let self;
    if (_canRemove == null) { _canRemove = true; }
    const execute = () => _.insertAndExecuteCell(_type, _input);

    const insert = () => _.insertCell(_type, _input);

    const remove = function() {
      if (_canRemove) { return removeClip(_list, self); }
    };

    return self = {
      type: _type,
      input: _input,
      execute,
      insert,
      remove,
      canRemove: _canRemove
    };
  };

  const addClip = (list, type, input) => list.push(createClip(list, type, input));

  var removeClip = function(list, clip) {
    if (list === _userClips) {
      _userClips.remove(clip);
      saveUserClips();
      return _trashClips.push(createClip(_trashClips, clip.type, clip.input));
    } else {
      return _trashClips.remove(clip);
    }
  };

  const emptyTrash = () => _trashClips.removeAll();

  const loadUserClips = () => _.requestObjectExists('environment', 'clips', function(error, exists) {
    if (exists) {
      return _.requestObject('environment', 'clips', function(error, doc) {
        if (!error) {
          return _userClips(map(doc.clips, clip => createClip(_userClips, clip.type, clip.input))
          );
        }
      });
    }
  });

  const serializeUserClips = () => ({
    version: '1.0.0',

    clips: map(_userClips(), clip => ({
      type: clip.type,
      input: clip.input
    }))
  });

  var saveUserClips = () => _.requestPutObject('environment', 'clips', serializeUserClips(), function(error) {
    if (error) {
      _.alert(`Error saving clips: ${error.message}`);
    }
  });

  const initialize = function() {
    _systemClips(map(SystemClips, input => createClip(_systemClips, 'cs', input, false))
    );

    return link(_.ready, function() {
      loadUserClips();
      return link(_.saveClip, function(category, type, input) {
        input = input.trim();
        if (input) {
          if (category === 'user') {
            addClip(_userClips, type, input);
            return saveUserClips();
          } else {
            return addClip(_trashClips, type, input);
          }
        }
      });
    });
  };

  initialize();

  return {
    systemClips: _systemClips,
    systemClipCount: _systemClipCount,
    userClips: _userClips,
    hasUserClips: _hasUserClips,
    userClipCount: _userClipCount,
    trashClips: _trashClips,
    trashClipCount: _trashClipCount,
    hasTrashClips: _hasTrashClips,
    emptyTrash
  };
};


