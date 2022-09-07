/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS202: Simplify dynamic range loops
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { defer, delay, map } = require('lodash');
const d3 = require('d3');
const moment = require('moment');

const { signal, signals, act, react } = require('../../core/modules/dataflow');

const html = require('../../core/modules/html');
const failure = require('../../core/components/failure');
const FlowError = require('../../core/modules/flow-error');
const util = require('../../core/modules/util');

module.exports = function(_, _go, _cloud) {
  const _exception = signal(null); //TODO Display in .pug
  const _isLive = signal(false);
  const _isBusy = signal(false);

  const _isExpanded = signal(false);

  const _name = signal();
  const _size = signal();
  const _uptime = signal();
  const _version = signal();
  const _nodeCounts = signal();
  const _hasConsensus = signal();
  const _isLocked = signal();
  const _isHealthy = signal();
  const _nodes = signals();
  
  const formatMilliseconds = ms => util.fromNow(new Date((new Date()).getTime() - ms));

  const format3f = d3.format('.3f'); // precision = 3

  const _sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const prettyPrintBytes = function(bytes) {
    if (bytes === 0) { return '-'; }
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + _sizes[i];
  };

  const formatThreads = function(fjs) {
    let i, max_lo;
    let asc, end;
    let asc1, end1;
    for (max_lo = 120; max_lo > 0; max_lo--) {
      if (fjs[max_lo - 1] !== -1) {
        break;
      }
    }
    let s = '[';
    for (i = 0, end = max_lo, asc = 0 <= end; asc ? i < end : i > end; asc ? i++ : i--) {
      s += Math.max(fjs[i], 0);
      s += '/';
    }
    s += '.../';
    for (i = 120, end1 = fjs.length - 1, asc1 = 120 <= end1; asc1 ? i < end1 : i > end1; asc1 ? i++ : i--) {
      s += fjs[i];
      s += '/';
    }
    s += fjs[fjs.length - 1];
    s += ']';

    return s;
  };
    

  const sum = function(nodes, attrOf) {
    let total = 0;
    for (let node of Array.from(nodes)) {
      total += attrOf(node);
    }
    return total;
  };

  const avg = (nodes, attrOf) => (sum(nodes, attrOf)) / nodes.length;

  const _headers = [
    // [ Caption, show_always? ]
    [ "&nbsp;", true ],
    [ "Name", true ],
    [ "Ping", true ],
    [ "Cores", true ],
    [ "Load", true ],
    [ "My CPU %", true ],
    [ "Sys CPU %", true ],
    [ "GFLOPS", true ],
    [ "Memory Bandwidth", true ],
    [ "Data", true ],
    [ "GC (Free / Max)", true ],
    [ "Disk (Free / Max)", true ],
    [ "Disk (% Free)", true ],
    [ "PID", false ],
    [ "Keys", false ],
    [ "TCP", false ],
    [ "FD", false ],
    [ "RPCs", false ],
    [ "Threads", false ],
    [ "Tasks", false ]
  ];

  const createNodeRow = node => [
    node.healthy,
    node.ip_port,
    (moment(new Date(node.last_ping))).fromNow(),
    node.num_cpus,
    format3f(node.sys_load),
    node.my_cpu_pct,
    node.sys_cpu_pct,
    format3f(node.gflops),
    `${prettyPrintBytes(node.mem_bw)} / s`,
    `${prettyPrintBytes(node.mem_value_size)}`,
    `${prettyPrintBytes(node.free_mem)} / ${prettyPrintBytes(node.max_mem)}`,
    `${prettyPrintBytes(node.free_disk)} / ${prettyPrintBytes(node.max_disk)}`,
    `${Math.floor((node.free_disk * 100) / node.max_disk)}%`,
    node.pid,
    node.num_keys,
    node.tcps_active,
    node.open_fds,
    node.rpcs_active,
    formatThreads(node.fjthrds),
    formatThreads(node.fjqueue)
  ];

  const createTotalRow = function(cloud) {
    const {
      nodes
    } = cloud;
    return [
      cloud.cloud_healthy, 
      'TOTAL',
      '-',
      sum(nodes, node => node.num_cpus),
      format3f(sum(nodes, node => node.sys_load)),
      '-',
      '-',
      `${(format3f(sum(nodes, node => node.gflops)))}`,
      `${prettyPrintBytes((sum(nodes, node => node.mem_bw)))} / s`,
      `${prettyPrintBytes((sum(nodes, node => node.mem_value_size)))}`,
      `${prettyPrintBytes((sum(nodes, node => node.free_mem)))} / ${prettyPrintBytes((sum(nodes, node => node.max_mem)))}`,
      `${prettyPrintBytes((sum(nodes, node => node.free_disk)))} / ${prettyPrintBytes((sum(nodes, node => node.max_disk)))}`,
      `${Math.floor((avg(nodes, node => (node.free_disk * 100) / node.max_disk)))}%`,
      '-',
      sum(nodes, node => node.num_keys),
      sum(nodes, node => node.tcps_active),
      sum(nodes, node => node.open_fds),
      sum(nodes, node => node.rpcs_active),
      '-',
      '-'
    ];
  };

  const createGrid = function(cloud, isExpanded) {
    const [ grid, table, thead, tbody, tr, th, td, success, danger] = Array.from(html.template('.grid', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'i.fa.fa-check-circle.text-success', 'i.fa.fa-exclamation-circle.text-danger'));
    const nodeRows = map(cloud.nodes, createNodeRow);
    nodeRows.push(createTotalRow(cloud));

    const ths = (() => {
      const result = [];
      for (let [ caption, showAlways ] of Array.from(_headers)) {
        if (showAlways || isExpanded) {
          result.push(th(caption));
        }
      }
      return result;
    })();

    const trs = (() => {
      const result1 = [];
      for (var row of Array.from(nodeRows)) { 
        const tds = (() => {
          const result2 = [];
          for (let i = 0; i < row.length; i++) {
            const cell = row[i];
            if (_headers[i][1] || isExpanded) {
              if (i === 0) {
                result2.push(td(cell ? success() : danger()));
              } else {
                result2.push(td(cell));
              }
            }
          }
          return result2;
        })();
        result1.push(tr(tds));
      }
      return result1;
    })();

    return html.render('div',
      grid([
        table([
          thead(tr(ths)),
          tbody(trs)
        ])
      ]));
  };

  const updateCloud = function(cloud, isExpanded) {
    _name(cloud.cloud_name);
    _version(cloud.version);
    _hasConsensus(cloud.consensus);
    _uptime(formatMilliseconds(cloud.cloud_uptime_millis));
    _nodeCounts(`${cloud.cloud_size - cloud.bad_nodes} / ${cloud.cloud_size}`);
    _isLocked(cloud.locked);
    _isHealthy(cloud.cloud_healthy);
    return _nodes(createGrid(cloud, isExpanded));
  };

  const toggleRefresh = () => _isLive(!_isLive());

  var refresh = function() {
    _isBusy(true);
    return _.requestCloud(function(error, cloud) {
      _isBusy(false);
      if (error) {
        _exception(failure(_, new FlowError('Error fetching cloud status', error)));
        return _isLive(false);
      } else {
        updateCloud((_cloud = cloud), _isExpanded());
        if (_isLive()) { return delay(refresh, 2000); }
      }
    });
  };

  act(_isLive, function(isLive) {
    if (isLive) { return refresh(); }
  });

  const toggleExpansion = () => _isExpanded(!_isExpanded());

  act(_isExpanded, isExpanded => updateCloud(_cloud, isExpanded));

  updateCloud(_cloud, _isExpanded());

  defer(_go);

  return {
    name: _name,
    size: _size,
    uptime: _uptime,
    version: _version,
    nodeCounts: _nodeCounts,
    hasConsensus: _hasConsensus,
    isLocked: _isLocked,
    isHealthy: _isHealthy,
    nodes: _nodes,
    isLive: _isLive,
    isBusy: _isBusy,
    toggleRefresh,
    refresh,
    isExpanded: _isExpanded,
    toggleExpansion,
    template: 'flow-cloud-output'
  };
};

