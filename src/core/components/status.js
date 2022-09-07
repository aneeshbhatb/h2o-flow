/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { lift, link, signal } = require("../modules/dataflow");
const { defer } = require('lodash');

exports.init = function(_) {
  const defaultMessage = 'Ready';
  const _message = signal(defaultMessage);
  const _connections = signal(0);
  const _isBusy = lift(_connections, connections => connections > 0);
  
  const onStatus = function(category, type, data) {
    let connections;
    console.debug('Status:', category, type, data);
    switch (category) {
      case 'server':
        switch (type) {
          case 'request':
            _connections(_connections() + 1);
            return defer(_message, 'Requesting ' + data);
          case 'response': case 'error':
            _connections(connections = _connections() - 1);
            if (connections) {
              return defer(_message, `Waiting for ${connections} responses...`);
            } else {
              return defer(_message, defaultMessage);              
            }
        }
        break;
    }
  };
  
  link(_.ready, () => link(_.status, onStatus));

  return {
    message: _message,
    connections: _connections,
    isBusy: _isBusy
  };
};
