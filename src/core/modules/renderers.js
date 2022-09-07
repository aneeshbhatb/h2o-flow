/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const heading = require("../components/heading");
const markdown = require("../components/markdown");
const coffeescript = require("../components/coffeescript");
const raw = require("../components/raw");

exports.init = (_, _sandbox) => ({
  h1() { return heading(_, 'h1'); },
  h2() { return heading(_, 'h2'); },
  h3() { return heading(_, 'h3'); },
  h4() { return heading(_, 'h4'); },
  h5() { return heading(_, 'h5'); },
  h6() { return heading(_, 'h6'); },
  md() { return markdown(_); },
  cs(guid) { return coffeescript(_, guid, _sandbox); },
  sca(guid) { return coffeescript(_, guid, _sandbox); },
  raw() { return raw(_); }
});
