/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { defer, map } = require('lodash');

const { stringify } = require('../../core/modules/prelude');
const { react, lift, link, signal, signals } = require("../../core/modules/dataflow");
const { TString, TNumber } = require('../../core/modules/types');

module.exports = function(_, _go, _frame) {
  const _types = [ 'point', 'path', 'rect' ];
  const _vectors = Array.from(_frame.vectors).filter((vector) => (vector.type === TString) || (vector.type === TNumber)).map((vector) =>
    vector.label);

  const _type = signal(null);
  const _x = signal(null);
  const _y = signal(null);
  const _color = signal(null);
  const _canPlot = lift(_type, _x, _y, (type, x, y) => type && x && y);
  
  const plot = function() {
    const color = _color();
    const command = color ?
      `\
plot (g) -> g(
  g.${_type()}(
    g.position ${stringify(_x())}, ${stringify(_y())}
    g.color ${stringify(color)}
  )
  g.from inspect ${stringify(_frame.label)}, ${_frame.metadata.origin}
)\
`
    :
      `\
plot (g) -> g(
  g.${_type()}(
    g.position ${stringify(_x())}, ${stringify(_y())}
  )
  g.from inspect ${stringify(_frame.label)}, ${_frame.metadata.origin}
)\
`;
    return _.insertAndExecuteCell('cs', command);
  };

  defer(_go);

  return {
    types: _types,
    type: _type,
    vectors: _vectors,
    x: _x,
    y: _y,
    color: _color,
    plot,
    canPlot: _canPlot,
    template: 'flow-plot-input'
  };
};

