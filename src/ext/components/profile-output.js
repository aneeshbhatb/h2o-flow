/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { defer, head } = require('lodash');

const { react, lift, link, signal, signals } = require("../../core/modules/dataflow");

module.exports = function(_, _go, _profile) {
  let node;
  const _activeNode = signal(null);

  const createNode = function(node) {
    let self;
    const display = () => _activeNode(self);

    const entries = Array.from(node.entries).map((entry) => ({
      stacktrace: entry.stacktrace,
      caption: `Count: ${entry.count}`
    }));

    return self = {
      name: node.node_name,
      caption: `${node.node_name} at ${new Date(node.timestamp)}`,
      entries, 
      display
    };
  };

  const _nodes = (() => {
    const result = [];
    for (let i = 0; i < _profile.nodes.length; i++) {
      node = _profile.nodes[i];
      result.push(createNode(node));
    }
    return result;
  })();

  _activeNode(head(_nodes));

  defer(_go);

  return {
    nodes: _nodes,
    activeNode: _activeNode,
    template: 'flow-profile-output'
  };
};
