/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const marked = require('marked');
const highlightjs = require('highlightjs');

marked.setOptions({
  smartypants: true,
  highlight(code, lang) {
    return (highlightjs.highlightAuto(code, [ lang ])).value;
  }
});

module.exports = marked;
