/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { defer, map, delay } = require('lodash');

const { stringify } = require('../../core/modules/prelude');
const { act, react, lift, link, signal, signals } = require("../../core/modules/dataflow");
const { formatJobType } = require("./formatters");

const failure = require('../../core/components/failure');
const FlowError = require('../../core/modules/flow-error');
const util = require('../../core/modules/util');
const format = require('../../core/modules/format');

module.exports = function(_, _go, jobs) {
  const _jobViews = signals([]);
  const _hasJobViews = lift(_jobViews, jobViews => jobViews.length > 0);
  const _isLive = signal(false);
  const _isBusy = signal(false);
  const _exception = signal(null);

  const createJobView = function(job) {
    const view = () => _.insertAndExecuteCell('cs', `getJob ${stringify(job.key.name)}`);

    return {
      destination: job.dest.name,
      type: formatJobType(job.dest.type),
      description: job.description,
      startTime: format.Time(new Date(job.start_time)),
      endTime: format.Time(new Date(job.start_time + job.msec)),
      elapsedTime: util.formatMilliseconds(job.msec),
      status: job.status,
      view
    };
  };

  const toggleRefresh = () => _isLive(!_isLive());

  var refresh = function() {
    _isBusy(true);
    return _.requestJobs(function(error, jobs) {
      _isBusy(false);
      if (error) {
        _exception(failure(_, new FlowError('Error fetching jobs', error)));
        return _isLive(false);
      } else {
        _jobViews(map(jobs, createJobView));
        if (_isLive()) { return delay(refresh, 2000); }
      }
    });
  };

  act(_isLive, function(isLive) {
    if (isLive) { return refresh(); }
  });

  const initialize = function() {
    _jobViews(map(jobs, createJobView));
    return defer(_go);
  };

  initialize();

  return {
    jobViews: _jobViews,
    hasJobViews: _hasJobViews,
    isLive: _isLive,
    isBusy: _isBusy,
    toggleRefresh,
    refresh,
    exception: _exception,
    template: 'flow-jobs-output'
  };
};

