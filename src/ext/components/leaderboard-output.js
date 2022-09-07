/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS202: Simplify dynamic range loops
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { defer, map, delay } = require('lodash');

const { stringify } = require('../../core/modules/prelude');
const { act, react, lift, link, signal, signals } = require("../../core/modules/dataflow");

const html = require('../../core/modules/html');
const failure = require('../../core/components/failure');
const FlowError = require('../../core/modules/flow-error');

module.exports = function(_, _go, _result) {

  const _leaderboard = signal('');
  const _leaderboardDescription = signal('');
  const _eventLog = signal('');
  const _eventLogDescription = signal('');
  const _exception = signal(null);
  const _isLive = signal(false);

  const renderLeaderboard = function(leaderboard) {
    let i;
    let asc, end;
    const [table, thead, tbody, tr, th, td, a] = Array.from(html.template('table', 'thead', 'tbody', 'tr', 'th', 'td', "a href='#' data-key='$1'"));

    const { description, columns, rowcount, data } = leaderboard;

    let modelIdColumnIndex = -1;
    for (i = 0; i < columns.length; i++) {
      const column = columns[i];
      if (column.name === 'model_id') {
        modelIdColumnIndex = i;
      }
    }

    const ths = map(columns, column => th(column.name));

    const trs = [];
    for (i = 0, end = rowcount, asc = 0 <= end; asc ? i < end : i > end; asc ? i++ : i--) {
      trs.push(tr(map(data, function(d, j) {
        if (j === modelIdColumnIndex) {
          return td(a(d[i], d[i]));
        } else {
          return td(d[i]);
        }
    })));
    }

    const leaderboardEl = html.render('div', table([
      thead(tr(ths)),
      tbody(trs)
    ]));

    $('a', leaderboardEl).on('click', function(e) {
      const $a = $(e.target);
      return _.insertAndExecuteCell('cs', `getModel ${stringify($a.attr('data-key'))}`);
    });

    _leaderboardDescription(description);
    return _leaderboard(leaderboardEl);
  };

  const renderEventLog = function(event_log) {
    const [table, thead, tbody, tr, th, td] = Array.from(html.template('table', 'thead', 'tbody', 'tr', 'th', 'td'));

    const { description, columns, rowcount, data } = event_log;

    const ths = map(columns, column => th(column.name));

    const trs = [];
    for (var i = 0, end = rowcount, asc = 0 <= end; asc ? i < end : i > end; asc ? i++ : i--) {
      trs.push(tr(map(data, d => td(d[i]))));
    }

    _eventLogDescription(description);
    return _eventLog(html.render('div', table([
      thead(tr(ths)),
      tbody(trs)
    ])));
  };

  const render = function(result) {
    renderLeaderboard(result.leaderboard_table);
    return renderEventLog(result.event_log_table);
  };

  const toggleRefresh = () => _isLive(!_isLive());

  var refresh = () => _.requestLeaderboard(_result.automl_id.name, function(error, result) {
    if (error) {
      _exception(failure(_, new FlowError('Error fetching leaderboard', error)));
      return _isLive(false);
    } else {
      render(result);
      if (_isLive()) { return delay(refresh, 2000); }
    }
  });

  act(_isLive, function(isLive) {
    if (isLive) { return refresh(); }
  });

  render(_result);

  defer(_go);

  return {
    leaderboard: _leaderboard,
    leaderboardDescription: _leaderboardDescription,
    eventLog: _eventLog,
    eventLogDescription: _eventLogDescription,
    isLive: _isLive,
    toggleRefresh,
    exception: _exception,
    template: 'flow-leaderboard-output'
  };
};

