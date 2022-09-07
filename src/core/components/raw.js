/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
module.exports = function(_) {
  const render = function(input, output) {
    output.data({
      text: input,
      template: 'flow-raw'
    });
    return output.end();
  };
  render.isCode = false;
  return render;
};
