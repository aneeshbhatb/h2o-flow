/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */

const jobTypePat = /^Key<(\w+)>/;

const formatJobType = function(jobType) {
  if (jobType) {
    if (jobTypePat.test(jobType)) {
      return jobType.replace(jobTypePat, "$1");
    } else {
      return "Unknown";
    }
  } else {
    return "Removed";
  }
};

module.exports =
  {formatJobType};
