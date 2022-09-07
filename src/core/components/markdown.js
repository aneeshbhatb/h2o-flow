/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const marked = require('../modules/marked');

module.exports = function(_) {
  const render = function(input, output) {
    try {
      return output.data({
        html: marked(input.trim() || '(No content)'),
        template: 'flow-html'
      });
    } catch (error) {
      return output.error(error);
    }
    finally {
      output.end();
    }
  };
  render.isCode = false;
  return render;
};

