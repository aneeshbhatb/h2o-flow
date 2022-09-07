/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { map, sortBy } = require('lodash');

const { lift, link, signal, signals } = require("../modules/dataflow");
const { fromNow } = require('../modules/util');

exports.init = function(_) {
  const _docs = signals([]);

  const _sortedDocs = lift(_docs, docs => sortBy(docs, doc => -doc.date().getTime()));

  const _hasDocs = lift(_docs, docs => docs.length > 0);

  const createNotebookView = function(notebook) {
    let self;
    const _name = notebook.name;
    const _date = signal(new Date(notebook.timestamp_millis));
    const _fromNow = lift(_date, fromNow);

    const load = () => _.confirm('This action will replace your active notebook.\nAre you sure you want to continue?', { acceptCaption: 'Load Notebook', declineCaption: 'Cancel' }, function(accept) {
      if (accept) {
        return _.load(_name);
      }
    });

    const purge = () => _.confirm(`Are you sure you want to delete this notebook?\n\"${_name}\"`, { acceptCaption: 'Delete', declineCaption: 'Keep' }, function(accept) {
      if (accept) {
        return _.requestDeleteObject('notebook', _name, function(error) {
          if (error) {
            return _alert(error.message != null ? error.message : error);
          } else {
            _docs.remove(self);
            return _.growl('Notebook deleted.');
          }
        });
      }
    });

    return self = {
      name: _name,
      date: _date,
      fromNow: _fromNow,
      load,
      purge
    };
  };

  const loadNotebooks = () => _.requestObjects('notebook', function(error, notebooks) {
    if (error) {
      return console.debug(error);
    } else {
      //XXX sort
      return _docs(map(notebooks, notebook => createNotebookView(notebook)));
    }
  });

  link(_.ready, function() {
    loadNotebooks();

    link(_.saved, () => loadNotebooks());
    return link(_.loaded, () => loadNotebooks());
  });

  return {
    docs: _sortedDocs,
    hasDocs: _hasDocs,
    loadNotebooks
  };
};
