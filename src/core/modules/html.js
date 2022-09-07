/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const diecut = require('diecut');
const { isString } = require('lodash');

module.exports = {
  template: diecut,
  render(name, html) {
    const el = document.createElement(name);
    if (html) {
      if (isString(html)) {
        el.innerHTML = html;
      } else {
        el.appendChild(html);
      }
    }
    return el;
  }
};
