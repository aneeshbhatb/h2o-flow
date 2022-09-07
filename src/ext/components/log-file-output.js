/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { defer } = require('lodash');

const { react, lift, link, signal, signals } = require("../../core/modules/dataflow");

module.exports = function(_, _go, _cloud, _nodeIpPort, _fileType, _logFile) {
  const _exception = signal(null); //TODO Display in .pug.

  const _contents = signal('');
  const _nodes = signal([]);
  const _activeNode = signal(null);
  const _fileTypes = signal(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'httpd', 'stdout', 'stderr']);
  const _activeFileType = signal(null);

  const createNode = (node, index) => ({
    name: node.ip_port,
    index
  });

  const refreshActiveView = function(node, fileType) {
    if (node) {
      return _.requestLogFile(node.name, fileType, function(error, logFile) {
        if (error) {
          return _contents(`Error fetching log file: ${error.message}`);
        } else {
          return _contents(logFile.log);
        }
      });
    } else {
      return _contents('');
    }
  };

  const refresh = () => refreshActiveView(_activeNode(), _activeFileType());

  const initialize = function(cloud, nodeIpPort, fileType, logFile) {
    let n;
    _activeFileType(fileType);
    _contents(logFile.log);
    const nodes = [];
    if (cloud.is_client) {
      const clientNode = {ip_port: "self"};
      const NODE_INDEX_SELF = -1;
      nodes.push(createNode(clientNode, NODE_INDEX_SELF));
    }
    for (let i = 0; i < cloud.nodes.length; i++) {
      n = cloud.nodes[i];
      nodes.push(createNode(n, i));
    }
    _nodes(nodes);
    _activeNode(((() => {
      const result = [];
      for (n of Array.from(nodes)) {         if (n.name === nodeIpPort) {
          result.push(n);
        }
      }
      return result;
    })())[0]);
    react(_activeNode, _activeFileType, refreshActiveView);
    return defer(_go);
  };

  initialize(_cloud, _nodeIpPort, _fileType, _logFile);

  return {
    nodes: _nodes,
    activeNode: _activeNode,
    fileTypes: _fileTypes,
    activeFileType: _activeFileType,
    contents: _contents,  
    refresh,
    template: 'flow-log-file-output'
  };
};
