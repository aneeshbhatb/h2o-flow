const {slots, slot} = require("./dataflow");

module.exports = {
  ready: slots(),
  initialized: slots(),
  open: slot(),
  load: slot(),
  saved: slots(),
  loaded: slots(),
  setDirty: slots(),
  setPristine: slots(),
  status: slot(),
  trackEvent: slot(),
  trackException: slot(),
  selectCell: slot(),
  insertCell: slot(),
  insertAndExecuteCell: slot(),
  executeAllCells: slot(),
  showHelp: slot(),
  showOutline: slot(),
  showBrowser: slot(),
  showClipboard: slot(),
  saveClip: slot(),
  growl: slot(),
  confirm: slot(),
  alert: slot(),
  dialog: slot()
};
