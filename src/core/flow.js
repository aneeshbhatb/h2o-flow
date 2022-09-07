/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// 
// TODO
//
// XXX how does cell output behave when a widget throws an exception?
// XXX GLM case is failing badly. Investigate. Should catch/handle gracefully.
//
// tooltips on celltype flags
// arrow keys cause page to scroll - disable those behaviors
// scrollTo() behavior

const application = require('./modules/application');
const context = require("./modules/application-context");
const h2oApplication = require('../ext/modules/application');

const ko = require('./modules/knockout');

const getContextPath = function(_) {
    if (process.env.NODE_ENV === "development") {
      console.debug("Development mode, using localhost:54321");
      return _.ContextPath = "http://localhost:54321/";
    } else {
      const url = window.location.toString();
      if (!url.endsWith("flow/index.html")) {
        console.warn("URL does not have expected form -> does not end with /flow/index.html");
        return _.ContextPath = "/";
      } else {
        return _.ContextPath = url.substring(0, url.length - "flow/index.html".length);
      }
    }
  };

const checkSparklingWater = function(context) {
    context.onSparklingWater = false;
    return $.ajax({
        url: context.ContextPath + "3/Metadata/endpoints",
        type: 'GET',
        dataType: 'json',
        success(response) {
            return (() => {
              const result = [];
              for (let route of Array.from(response.routes)) {
                if (route.url_pattern === '/3/scalaint') {
                    result.push(context.onSparklingWater = true);
                  } else {
                  result.push(undefined);
                }
              }
              return result;
            })();
          },
        async: false
    });
  };

$(function() {
  console.debug("Starting Flow");
  getContextPath(context);
  checkSparklingWater(context);
  window.flow = application.init(context);
  h2oApplication.init(context);
  ko.applyBindings(window.flow);
  context.ready();
  context.initialized();
  return console.debug("Initialization complete", context);
});
