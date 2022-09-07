/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { defer } = require('lodash');

module.exports = function(_, _go, _items) {
  let name, item;
  const createAssistItem = (name, item) => ({
    name,
    description: item.description,
    icon: `fa fa-${item.icon} flow-icon`,
    execute() { return _.insertAndExecuteCell('cs', name); }
  });

  defer(_go);

  return {
    routines: (((() => {
      const result = [];
      for (name in _items) {
        item = _items[name];
        result.push(createAssistItem(name, item));
      }
      return result;
    })())),
    template: 'flow-assist'
  };
};
