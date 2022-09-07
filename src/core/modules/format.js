/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const d3 = require('d3');
const { identity } = require('lodash');

const significantDigitsBeforeDecimal = value => 1 + Math.floor(Math.log(Math.abs(value)) / Math.LN10);

const Digits = function(digits, value) {
  if (value === 0) {
    return 0;
  } else {
    const sd = significantDigitsBeforeDecimal(value);
    if (sd >= digits) {
      return value.toFixed(0);
    } else {
      const magnitude = Math.pow(10, digits - sd);
      return Math.round(value * magnitude) / magnitude;
    }
  }
};

const formatTime = d3.timeFormat('%Y-%m-%d %H:%M:%S');

const formatDate = function(time) { if (time) { return formatTime(new Date(time)); } else { return '-'; } };

const __formatReal = {};
const formatReal = function(precision) {
  const cached = __formatReal[precision];
  const format = cached ?
    cached
  :
    (__formatReal[precision] = precision === -1 ?
      identity
    :
      d3.format(`.${precision}f`));

  return value => format(value);
};

module.exports = {
  Digits,
  Real: formatReal,
  Date: formatDate,
  Time: formatTime
};

