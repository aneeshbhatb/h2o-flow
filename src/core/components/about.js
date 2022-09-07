/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { link, signal, signals } = require("../modules/dataflow");

exports.init = function(_) {
  _.Version = FLOW_VERSION; // global provided by webpack
  const _properties = signals([]);

  link(_.ready, function() {
    if (_.BuildProperties) {
      return _properties(_.BuildProperties);
    } else {
      return _.requestAbout(function(error, response) {
        let value;
        const properties = [];

        if (!error) {
          let name;
          for ({ name, value } of Array.from(response.entries)) {
            properties.push({
              caption: 'H2O ' + name,
              value
            });
          }
        }

        properties.push({
          caption: 'Flow version',
          value: _.Version
        });

        return _properties(_.BuildProperties = properties);
      });
    }
  });

  return {properties: _properties};
};

