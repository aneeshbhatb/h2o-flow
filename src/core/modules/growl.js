/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { link } = require("../modules/dataflow");

exports.init = _ => // Type should be one of:
// undefined = info (blue)
// success (green)
// warning (orange)
// danger (red)
link(_.growl, function(message, type) {
  if (type) {
    return $.bootstrapGrowl(message, {type});
  } else {
    return $.bootstrapGrowl(message);
  }
});
