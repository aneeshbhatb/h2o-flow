/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { defer, tail, head, delay } = require('lodash');

const { act, react, lift, link, signal, signals } = require("../../core/modules/dataflow");

const html = require('../../core/modules/html');
const failure = require('../../core/components/failure');
const FlowError = require('../../core/modules/flow-error');

module.exports = function(_, _go, _timeline) {
  const _isLive = signal(false);
  const _isBusy = signal(false);

  const _headers = [
    'HH:MM:SS:MS',
    'nanosec',
    'Who',
    'I/O Type',
    'Event',
    'Type',
    'Bytes'
  ];

  const _data = signal(null);
  const _timestamp = signal(Date.now());

  const createEvent = function(event) {
    switch (event.type) {
      case 'io':
        return [
          event.date,
          event.nanos,
          event.node,
          event.io_flavor || '-',
          'I/O',
          '-',
          event.data
        ];

      case 'heartbeat':
        return [
          event.date,
          event.nanos,
          'many &#8594;  many',
          'UDP',
          event.type,
          '-',
          `${event.sends} sent ${event.recvs} received`
        ];

      case 'network_msg':
        return [
          event.date,
          event.nanos,
          `${event.from} &#8594; ${event.to}`,
          event.protocol,
          event.msg_type,
          event.is_send ? 'send' : 'receive',
          event.data
        ];
    }
  };

  const updateTimeline = function(timeline) {
    const [ grid, table, thead, tbody, tr, th, td ] = Array.from(html.template('.grid', 'table', 'thead', 'tbody', 'tr', 'th', 'td'));

    const ths = (Array.from(_headers).map((header) => th(header)));

    const trs = Array.from(timeline.events).map((event) =>
      tr((Array.from(createEvent(event)).map((cell) => td(cell)))));

    return _data(html.render('div',
      grid([
        table([
          thead(tr(ths)),
          tbody(trs)
        ])
      ])));
  };

  const toggleRefresh = () => _isLive(!_isLive());

  var refresh = function() {
    _isBusy(true);
    return _.requestTimeline(function(error, timeline) {
      _isBusy(false);
      if (error) {
        _exception(failure()(_, new FlowError('Error fetching timeline', error)));
        return _isLive(false);
      } else {
        updateTimeline(timeline);
        if (_isLive()) { return delay(refresh, 2000); }
      }
    });
  };

  act(_isLive, function(isLive) {
    if (isLive) { return refresh(); }
  });

  updateTimeline(_timeline); 

  defer(_go);

  return {
    data: _data,
    isLive: _isLive,
    isBusy: _isBusy,
    toggleRefresh,
    refresh,
    template: 'flow-timeline-output'
  };
};

