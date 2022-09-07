/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { defer, tail, head} = require('lodash');

const { react, lift, link, signal, signals } = require("../../core/modules/dataflow");

module.exports = function(_, _go, _stackTrace) {
  let node;
  const _activeNode = signal(null);

  const createThread = function(thread) {
    const lines = thread.split('\n');

    return {
      title: head(lines),
      stackTrace: (tail(lines)).join('\n')
    };
  };

  const createNode = function(node) {
    let self;
    const display = () => _activeNode(self);

    return self = {
      name: node.node,
      timestamp: new Date(node.time),
      threads: ((Array.from(node.thread_traces).map((thread) => createThread(thread)))),
      display
    };
  };

  const _nodes = (() => {
    const result = [];
    for (node of Array.from(_stackTrace.traces)) {
      result.push(createNode(node));
    }
    return result;
  })(); 

  _activeNode(head(_nodes));

  defer(_go);

  return {
    nodes: _nodes,
    activeNode: _activeNode,
    template: 'flow-stacktrace-output'
  };
};

