/*
 * decaffeinate suggestions:
 * DS002: Fix invalid constructor
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const StackTrace = require("stacktrace-js");

const getCurrentStackTrace = function () {
  const stackFrames = StackTrace.get();
  return stackFrames.map((frame) => frame.toString());
};

class FlowError extends Error {
  constructor(message, cause) {
    this.message = message;
    this.cause = cause;
    super();
    this.name = "FlowError";
    if (this.cause != null ? this.cause.stack : undefined) {
      this.stack = this.cause.stack;
    } else {
      const error = new Error();
      if (!error.stack) {
        this.stack = error.stack;
      } else {
        this.stack = getCurrentStackTrace();
      }
    }
  }
}

module.exports = FlowError;
