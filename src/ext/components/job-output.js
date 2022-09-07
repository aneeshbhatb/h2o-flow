/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { defer, delay } = require('lodash');

const { stringify } = require('../../core/modules/prelude');
const { act, react, lift, link, signal, signals } = require("../../core/modules/dataflow");
const { formatJobType } = require("./formatters");

const failure = require('../../core/components/failure');
const FlowError = require('../../core/modules/flow-error');
const util = require('../../core/modules/util');

const jobOutputStatusColors = {
  failed: '#d9534f',
  done: '#ccc', //'#5cb85c'
  running: '#f0ad4e'
};

const getJobOutputStatusColor = function(status) {
  // CREATED   Job was created
  // RUNNING   Job is running
  // CANCELLED Job was cancelled by user
  // FAILED    Job crashed, error message/exception is available
  // DONE      Job was successfully finished
  switch (status) {
    case 'DONE':
      return jobOutputStatusColors.done;
    case 'CREATED': case 'RUNNING':
      return jobOutputStatusColors.running;
    default: // 'CANCELLED', 'FAILED'
      return jobOutputStatusColors.failed;
  }
};

const getJobProgressPercent = progress => `${Math.ceil(100 * progress)}%`;

module.exports = function(_, _go, _job) {
  const _isBusy = signal(false);
  const _isLive = signal(false);

  const _key = _job.key.name;
  const _description = _job.description;
  const _destinationKey = _job.dest.name;
  const _destinationType = formatJobType(_job.dest.type);
  const _runTime = signal(null);
  const _remainingTime = signal(null);
  const _progress = signal(null);
  const _progressMessage = signal(null);
  const _status = signal(null);
  const _statusColor = signal(null);
  const _exception = signal(null);
  const _messages = signal(null);
  const _canView = signal(false);
  const _canCancel = signal(false);

  const isJobRunning = job => (job.status === 'CREATED') || (job.status === 'RUNNING');

  const messageIcons = {
    ERROR: 'fa-times-circle red',
    WARN: 'fa-warning orange',
    INFO: 'fa-info-circle'
  };

  const canView = function(job) {
    switch (_destinationType) {
      case 'Model': case 'Grid': case 'AutoML':
        return job.ready_for_view;
      default:
        return !isJobRunning(job);
    }
  };

  const updateJob = function(job) {
    _runTime(util.formatMilliseconds(job.msec));
    _progress(getJobProgressPercent(job.progress));
    _remainingTime(job.progress ? (util.formatMilliseconds(Math.round(((1 - job.progress) * job.msec) / job.progress))) : 'Estimating...');
    _progressMessage(job.progress_msg);
    _status(job.status);
    _statusColor(getJobOutputStatusColor(job.status));
    if (job.error_count) {
      const messages = Array.from(job.messages).filter((message) => message.message_type !== 'HIDE').map((message) => ({
        icon: messageIcons[message.message_type],
        message: `${message.field_name}: ${message.message}`
      }));
      _messages(messages);

    } else if (job.exception) {
      const cause = new Error(job.exception);
      if (job.stacktrace) {
        cause.stack = job.stacktrace;
      }
      _exception(failure(_, new FlowError('Job failure.', cause)));
    }

    _canView(canView(job));
    return _canCancel(isJobRunning(job));
  };

  var refresh = function() {
    _isBusy(true);
    return _.requestJob(_key, function(error, job) {
      _isBusy(false);
      if (error) {
        _exception(failure(_, new FlowError('Error fetching jobs', error)));
        return _isLive(false);
      } else {
        updateJob(job);
        if (isJobRunning(job)) {
          if (_isLive()) { return delay(refresh, 1000); }
        } else {
          _isLive(false);
          if (_go) { return defer(_go); }
        }
      }
    });
  };

  act(_isLive, function(isLive) {
    if (isLive) { return refresh(); }
  });

  const view = function() {
    if (!_canView()) { return; }
    switch (_destinationType) {
      case 'Frame':
        return _.insertAndExecuteCell('cs', `getFrameSummary ${stringify(_destinationKey)}`); 
      case 'Model':
        return _.insertAndExecuteCell('cs', `getModel ${stringify(_destinationKey)}`);
      case 'Grid':
        return _.insertAndExecuteCell('cs', `getGrid ${stringify(_destinationKey)}`);
      case 'PartialDependence':
        return _.insertAndExecuteCell('cs', `getPartialDependence ${stringify(_destinationKey)}`);
      case 'AutoML':
        return _.insertAndExecuteCell('cs', `getLeaderboard ${stringify(_destinationKey)}`);
      case 'ScalaCodeResult':
        return _.insertAndExecuteCell('cs', `getScalaCodeExecutionResult ${stringify(_destinationKey)}`);
      case 'KeyedVoid':
        return alert(`This frame was exported to\n${_job.dest.name}`);
    }
  };

  const cancel = () => _.requestCancelJob(_key, function(error, result) {
    if (error) {
      return console.debug(error);
    } else {
      return updateJob(_job);
    }
  });

  const initialize = function(job) {
    updateJob(job);
    if (isJobRunning(job)) {
      return _isLive(true);
    } else {
      if (_go) { return defer(_go); }
    }
  };

  initialize(_job);

  return {
    key: _key,
    description: _description,
    destinationKey: _destinationKey,
    destinationType: _destinationType,
    runTime: _runTime,
    remainingTime: _remainingTime,
    progress: _progress,
    progressMessage: _progressMessage,
    status: _status,
    statusColor: _statusColor,
    messages: _messages,
    exception: _exception,
    isLive: _isLive,
    canView: _canView,
    canCancel: _canCancel,
    cancel,
    view,
    template: 'flow-job-output'
  };
};

