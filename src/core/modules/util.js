/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS202: Simplify dynamic range loops
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const moment = require('moment');
const uuid = require('uuid');
const highlightjs = require('highlightjs');
const { map, escape } = require("lodash");

const { link, signal, signals } = require("../modules/dataflow");
const html = require('./html');

const describeCount = function(count, singular, plural) {
  if (!plural) { plural = singular + 's'; }
  switch (count) {
    case 0:
      return `No ${plural}`;
    case 1:
      return `1 ${singular}`;
    default:
      return `${count} ${plural}`;
  }
};

const fromNow = date => (moment(date)).fromNow();

const formatBytes = function(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) { return '0 Byte'; }
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
  return Math.round(bytes / Math.pow(1024, i), 2) + sizes[i];
};

const padTime = n => `${n < 10 ? '0' : ''}${n}`;

const splitTime = function(s) {
  const ms = s % 1000;
  s = (s - ms) / 1000;
  const secs = s % 60;
  s = (s - secs) / 60;
  const mins = s % 60;
  const hrs = (s - mins) / 60;

  return [ hrs, mins, secs, ms ];
};

const formatMilliseconds = function(s) {
  const [ hrs, mins, secs, ms ] = Array.from(splitTime(s));
  return `${padTime(hrs)}:${padTime(mins)}:${padTime(secs)}.${ms}`;
};

const format1d0 = n => Math.round(n * 10) / 10;

const formatElapsedTime = function(s) {
  const [ hrs, mins, secs, ms ] = Array.from(splitTime(s));
  if (hrs !== 0) {
    return `${format1d0(((hrs * 60) + mins)/60)}h`;
  } else if (mins !== 0) {
    return `${format1d0(((mins * 60) + secs)/60)}m`;
  } else if (secs !== 0) {
    return `${format1d0(((secs * 1000) + ms)/1000)}s`;
  } else {
    return `${ms}ms`;
  }
};

const formatClockTime = date => (moment(date)).format('h:mm:ss a');

const EOL = "\n";
const multilineTextToHTML = text => (map(text.split(EOL), str => escape(str))).join('<br/>');

const sanitizeName = name => name.replace(/[^a-z0-9_ \(\)-]/gi, '-').trim();

const highlight = (code, lang) => (highlightjs.highlightAuto(code, [ lang ])).value;

//TODO copied over from routines.coffee. replace post h2o.js integration.
const format4f = function(number) {
  if (number) {
    if (number === 'NaN') {
      return undefined;
    } else {
      return number.toFixed(4).replace(/\.0+$/, '.0');
    }
  } else {
    return number;
  }
};

const calcRecall = function(cm, index, firstInvalidIndex) {
    const tp = cm.data[index][index];
    let fn = 0;
    for (let i = 0; i < cm.data.length; i++) {
      const column = cm.data[i];
      if (i >= firstInvalidIndex) {
          break;
        }
      if (i !== index) { // if not on diagonal
          fn += column[index];
        }
    }
    const result = tp / (tp + fn);
    return parseFloat(result).toFixed(2).replace(/\.0+$/, '.0');
  };

const calcPrecision = function(cm, index, firstInvalidIndex) {
    const tp = cm.data[index][index];
    let fp = 0;
    for (let i = 0; i < cm.data[index].length; i++) {
      const value = cm.data[index][i];
      if (i >= firstInvalidIndex) { // do not count Error, Rate and Recall columns
          break;
        }
      if (i !== index) { // if not on diagonal
          fp += value;
        }
    }
    const result = tp / (tp + fp);
    return parseFloat(result).toFixed(2).replace(/\.0+$/, '.0');
  };

const getCellWithTooltip = function(tdClasses, content, tooltipText) {
    const textDiv = html.template("span.tooltip-text")(tooltipText);
    const tooltipDiv = html.template("div.tooltip-tooltip")([content, textDiv]);
    return html.template(`td.${tdClasses}`)(tooltipDiv);
  };

const renderMultinomialConfusionMatrix = function(title, cm) {
  let plot;
  let i, column, tooltipText;
  if (cm.columns.length <= (100 + 2)) { // + 2 for Error and Rate columns
    cm.columns.push({'name':'Precision', 'type':'long', 'format': '%.2f', 'description': 'Precision'});
    const errorColumnIndex = cm.columns.length - 3; // last three cols are Error, Rate Recall
    const precisionValues = [];
    cm.rowcount += 1; // We will have new row with Precision values
    const totalRowIndex = cm.rowcount - 2; // Last two rows will be Totals and Precision
    for (i = 0; i < cm.data.length; i++) {
      column = cm.data[i];
      if (i < errorColumnIndex) {
          column.push(calcRecall(cm, i, errorColumnIndex)); // calculate recall for each feature and add it as last column for each row
        }
      if (i < totalRowIndex) {
          precisionValues.push(calcPrecision(cm, i, totalRowIndex)); // calculate precision for each feature and add it as last row for each column
        }
    }
    cm.data.push(precisionValues); // add recall values as new (last) column

    const [table, tbody, tr, normal, bold] = Array.from(html.template('table.flow-confusion-matrix', 'tbody', 'tr', 'td', 'td.strong'));
    const tooltip = tooltipText => content => getCellWithTooltip('', content, tooltipText);
    const tooltipYellowBg = tooltipText => content => getCellWithTooltip('.bg-yellow', content, tooltipText);
    const tooltipBold = tooltipText => content => getCellWithTooltip('.strong', content, tooltipText);
    const headers = map(cm.columns, (column, i) => bold(column.description));
    headers.unshift(normal(' ')); // NW corner cell
    const rows = [tr(headers)];
    const precisionColumnIndex = cm.columns.length - 1;
    const recallRowIndex = cm.rowcount - 1;
    for (var rowIndex = 0, end = cm.rowcount, asc = 0 <= end; asc ? rowIndex < end : rowIndex > end; asc ? rowIndex++ : rowIndex--) {
      const cells = (() => {
        const result = [];
        for (i = 0; i < cm.data.length; i++) {
          column = cm.data[i];
          tooltipText = `Actual: ${cm.columns[rowIndex].description}&#013;&#010;Predicted: ${cm.columns[i].description}`;
          const cell = i < errorColumnIndex ?
            i === rowIndex ?
              tooltipYellowBg(tooltipText) // Yellow lines on diagonal
            :
              rowIndex < totalRowIndex ?
                tooltip(tooltipText) // "Basic" cells inside cm
              :
                rowIndex === totalRowIndex ?
                    tooltipBold(`Total: ${cm.columns[i].description}`) // Totals of features
                :
                    rowIndex === recallRowIndex ?
                        tooltipBold(`Recall: ${cm.columns[i].description}`) // Precision of features
                    :
                        bold
          :
            rowIndex < totalRowIndex ?
                tooltipBold(`${cm.columns[i].description}: ${cm.columns[rowIndex].description}`) // Error, Rate and Recall of features
            :
                (rowIndex === totalRowIndex) && (i < precisionColumnIndex) ?
                    tooltipBold(`Total: ${cm.columns[i].description}`) // Totals of Error and Rate
                :
                    bold;
          // special-format error column
          result.push(cell(i === errorColumnIndex ? format4f(column[rowIndex]) : column[rowIndex]));
        }
        return result;
      })();
      // Add the corresponding column label
      cells.unshift(bold(rowIndex === (cm.rowcount - 2) ? 'Total' : rowIndex === (cm.rowcount - 1) ? 'Recall' : cm.columns[rowIndex].description));
      rows.push(tr(cells));
      plot = html.render('div', table(tbody(rows)));
    }
  } else {
    plot = html.render('blockquote', 'Confusion Matrix too big to render.');
  }

  return {
    title: title + (cm.description ? ` ${cm.description}` : ''),
    plot: signal(plot),
    frame: signal(null),
    controls: signal(null),
    isCollapsed: false,
    canCombineWithFrame: false
  };
};

module.exports = {
  describeCount,
  fromNow,
  formatBytes,
  formatMilliseconds,
  formatElapsedTime,
  formatClockTime,
  multilineTextToHTML,
  uuid,
  sanitizeName,
  highlight,
  renderMultinomialConfusionMatrix
};
