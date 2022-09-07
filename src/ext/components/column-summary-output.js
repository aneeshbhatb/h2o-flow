/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { defer, head } = require('lodash');

const { react, lift, link, signal, signals } = require("../../core/modules/dataflow");
const { stringify } = require('../../core/modules/prelude');

module.exports = function(_, _go, frameKey, frame, columnName) {
  let table;
  const column = head(frame.columns);

  const _characteristicsPlot = signal(null);
  const _summaryPlot = signal(null);
  const _distributionPlot = signal(null);
  const _domainPlot = signal(null);

  const renderPlot = (target, render) => render(function(error, vis) {
    if (error) {
      return console.debug(error);
    } else {
      return target(vis.element);
    }
  });

  if (table = _.inspect('characteristics', frame)) {
    renderPlot(_characteristicsPlot, _.plot(g => g(
      g.rect(
        g.position(g.stack(g.avg('percent'), 0), 'All'),
        g.fillColor('characteristic')
      ),
      g.groupBy(g.factor(g.value('All')), 'characteristic'),
      g.from(table)
    ))
    );
  }

  if (table = _.inspect('distribution', frame)) {
    renderPlot(_distributionPlot, _.plot(g => g(
      g.rect(
        g.position('interval', 'count'),
        g.width(g.value(1))
      ),
      g.from(table)
    ))
    );
  }

  if (table = _.inspect('summary', frame)) {
    renderPlot(_summaryPlot, _.plot(g => g(
      g.schema(
        g.position('min', 'q1', 'q2', 'q3', 'max', 'column')
      ),
      g.from(table)
    ))
    );
  }

  if (table = _.inspect('domain', frame)) {
    renderPlot(_domainPlot, _.plot(g => g(
      g.rect(
        g.position('count', 'label')
      ),
      g.from(table),
      g.limit(1000)
    ))
    );
  }

  const impute = () => _.insertAndExecuteCell('cs', `imputeColumn frame: ${stringify(frameKey)}, column: ${stringify(columnName)}`);

  const inspect = () => _.insertAndExecuteCell('cs', `inspect getColumnSummary ${stringify(frameKey)}, ${stringify(columnName)}`);


  defer(_go);

  return {
    label: column.label,
    characteristicsPlot: _characteristicsPlot,
    summaryPlot: _summaryPlot,
    distributionPlot: _distributionPlot,
    domainPlot: _domainPlot,
    impute,
    inspect,
    template: 'flow-column-summary-output'
  };
};
