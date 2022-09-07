/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { defer } = require('lodash');

const { react, lift, link, signal, signals } = require("../../core/modules/dataflow");
const { stringify } = require('../../core/modules/prelude');

module.exports = function(_, _go) {
  const _key = signal('');
  const _rows = signal(10000);
  const _columns = signal(100);
  const _seed = signal(7595850248774471522);
  const _seed_for_column_types = signal(-1);
  const _randomize = signal(true);
  const _value = signal(0);
  const _realRange = signal(100);
  const _categoricalFraction = signal(0.1);
  const _factors = signal(5);
  const _integerFraction = signal(0.5);
  const _binaryFraction = signal(0.1);
  const _binaryOnesFraction = signal(0.02);
  const _timeFraction = signal(0);
  const _stringFraction = signal(0);
  const _integerRange = signal(1);
  const _missingFraction = signal(0.01);
  const _responseFactors = signal(2);
  const _hasResponse = signal(false);

  const createFrame = function() {
    const opts = {
      dest: _key(),
      rows: _rows(),
      cols: _columns(),
      seed: _seed(),
      seed_for_column_types: _seed_for_column_types(),
      randomize: _randomize(),
      value: _value(),
      real_range: _realRange(),
      categorical_fraction: _categoricalFraction(),
      factors: _factors(),
      integer_fraction: _integerFraction(),
      binary_fraction: _binaryFraction(),
      binary_ones_fraction: _binaryOnesFraction(),
      time_fraction: _timeFraction(),
      string_fraction: _stringFraction(),
      integer_range: _integerRange(),
      missing_fraction: _missingFraction(),
      response_factors: _responseFactors(),
      has_response: _hasResponse()
    };

    return _.insertAndExecuteCell('cs', `createFrame ${stringify(opts)}`);
  };

  defer(_go);

  return {
    key: _key,
    rows: _rows,
    columns: _columns,
    seed: _seed,
    seed_for_column_types: _seed_for_column_types,
    randomize: _randomize,
    value: _value,
    realRange: _realRange,
    categoricalFraction: _categoricalFraction,
    factors: _factors,
    integerFraction: _integerFraction,
    binaryFraction: _binaryFraction,
    binaryOnesFraction: _binaryOnesFraction,
    timeFraction: _timeFraction,
    stringFraction: _stringFraction,
    integerRange: _integerRange,
    missingFraction: _missingFraction,
    responseFactors: _responseFactors,
    hasResponse: _hasResponse,
    createFrame,
    template: 'flow-create-frame-input'
  };
};
        
        
