/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS202: Simplify dynamic range loops
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { defer, map, times, every, filter, throttle, forEach, find } = require('lodash');

const { stringify } = require('../../core/modules/prelude');
const { act, react, lift, link, signal, signals } = require("../../core/modules/dataflow");

const MaxItemsPerPage = 15;

const parseTypes = map([ 'AUTO', 'ARFF', 'XLS', 'XLSX', 'CSV', 'SVMLight', 'ORC', 'AVRO', 'PARQUET' ], type => ({
  type,
  caption: type
}));

const parseDelimiters = (function() {
  const whitespaceSeparators = [
    'NULL',
    'SOH (start of heading)',
    'STX (start of text)',
    'ETX (end of text)',
    'EOT (end of transmission)',
    'ENQ (enquiry)',
    'ACK (acknowledge)',
    "BEL '\\a' (bell)",
    "BS  '\\b' (backspace)",
    "HT  '\\t' (horizontal tab)",
    "LF  '\\n' (new line)",
    "VT  '\\v' (vertical tab)",
    "FF  '\\f' (form feed)",
    "CR  '\\r' (carriage ret)",
    'SO  (shift out)',
    'SI  (shift in)',
    'DLE (data link escape)',
    'DC1 (device control 1) ',
    'DC2 (device control 2)',
    'DC3 (device control 3)',
    'DC4 (device control 4)',
    'NAK (negative ack.)',
    'SYN (synchronous idle)',
    'ETB (end of trans. blk)',
    'CAN (cancel)',
    'EM  (end of medium)',
    'SUB (substitute)',
    'ESC (escape)',
    'FS  (file separator)',
    'GS  (group separator)',
    'RS  (record separator)',
    'US  (unit separator)',
    "' ' SPACE"
  ];

  const CHAR_CODE_PAD = '000';
  const createDelimiter = (caption, charCode) => ({
    charCode,
    caption: `${caption}: '${(CHAR_CODE_PAD + charCode).slice(-CHAR_CODE_PAD.length)}'`
  });

  const whitespaceDelimiters = map(whitespaceSeparators, createDelimiter);

  const characterDelimiters = times((126 - whitespaceSeparators.length), function(i) {
    const charCode = i + whitespaceSeparators.length;
    return createDelimiter((String.fromCharCode(charCode)), charCode);
  });

  const otherDelimiters = [ {charCode: -1, caption: 'AUTO'} ];

  return whitespaceDelimiters.concat(characterDelimiters, otherDelimiters);
})();

const dataTypes = [
  'Unknown',
  'Numeric',
  'Enum',
  'Time',
  'UUID',
  'String',
  'Invalid'
];

module.exports = function(_, _go, _inputs, _result) {
  const _inputKey = _inputs.paths ? 'paths' : 'source_frames';
  const _sourceKeys = map(_result.source_frames, src => src.name);
  const _parseType =  signal(find(parseTypes, parseType => parseType.type === _result.parse_type));
  const _canReconfigure = lift(_parseType, parseType => parseType.type !== 'SVMLight');
  const _delimiter = signal(find(parseDelimiters, delimiter => delimiter.charCode === _result.separator));
  const _useSingleQuotes = signal(_result.single_quotes);
  const _destinationKey = signal(_result.destination_frame);
  const _headerOptions = {auto: 0, header: 1, data: -1};
  const _headerOption = signal(_result.check_header === 0 ? 'auto' : _result.check_header === -1 ? 'data' : 'header');
  const _deleteOnDone = signal(true);
  const _columnNameSearchTerm = signal('');
  const _escapechar = signal(_result.escapechar);

  const _preview = signal(_result);
  const _chunkSize = lift(_preview, preview => preview.chunk_size);
  const refreshPreview = function() {
    const columnTypes = (Array.from(_columns()).map((column) => column.type()));
    return _.requestParseSetupPreview(_sourceKeys, _parseType().type, _delimiter().charCode, _useSingleQuotes(), _headerOptions[_headerOption()], columnTypes, _escapechar().charCodeAt(0), function(error, result) {
      if (!error) {
        return _preview(result);
      }
    });
  };

  var _columns = lift(_preview, function(preview) {
    const columnTypes = preview.column_types;
    const columnCount = columnTypes.length;
    const previewData = preview.data;
    const rowCount = previewData.length;
    const columnNames = preview.column_names;

    const rows = new Array(columnCount);
    for (let j = 0, end = columnCount, asc = 0 <= end; asc ? j < end : j > end; asc ? j++ : j--) {
      var row;
      const data = new Array(rowCount);
      for (let i = 0, end1 = rowCount, asc1 = 0 <= end1; asc1 ? i < end1 : i > end1; asc1 ? i++ : i--) {
        data[i] = previewData[i][j];
      }

      rows[j] = (row = {
        index: `${j + 1}`,
        name: signal(columnNames ? columnNames[j] : ''),
        type: signal(columnTypes[j]),
        data
      });
    }
    return rows;
  });

  const _columnCount = lift(_columns, columns => (columns != null ? columns.length : undefined) || 0);

  let _currentPage = 0;

  act(_columns, columns => forEach(columns, column => react(column.type, function() {
    _currentPage = _activePage().index;
    return refreshPreview();
  })));

  react(_parseType, _delimiter, _useSingleQuotes, _headerOption, function() {
    _currentPage = 0;
    return refreshPreview();
  });

  const _filteredColumns = lift(_columns, columns => columns);

  const makePage = (index, columns) => ({
    index,
    columns
  });

  var _activePage = lift(_columns, columns => makePage(_currentPage, columns));

  const filterColumns = () => _activePage(makePage(0, filter(_columns(), column => -1 < column.name().toLowerCase().indexOf(_columnNameSearchTerm().toLowerCase()))));

  react(_columnNameSearchTerm, throttle(filterColumns, 500));

  const _visibleColumns = lift(_activePage, function(currentPage) {
    const start = currentPage.index * MaxItemsPerPage;
    return currentPage.columns.slice(start, start + MaxItemsPerPage);
  });

  const parseFiles = function() {
    let column;
    let columnNames = ((() => {
      const result = [];
      for (column of Array.from(_columns())) {         result.push(column.name());
      }
      return result;
    })());
    let headerOption = _headerOptions[_headerOption()];
    if (every(columnNames, columnName => columnName.trim() === '')) {
      columnNames = null;
      headerOption = -1;
    }
    const columnTypes = ((() => {
      const result1 = [];
      for (column of Array.from(_columns())) {         result1.push(column.type());
      }
      return result1;
    })());

    return _.insertAndExecuteCell('cs', `parseFiles\n  ${_inputKey}: ${stringify(_inputs[_inputKey])}\n  destination_frame: ${stringify(_destinationKey())}\n  parse_type: ${stringify(_parseType().type)}\n  separator: ${_delimiter().charCode}\n  number_columns: ${_columnCount()}\n  single_quotes: ${_useSingleQuotes()}\n  ${_canReconfigure() ? 'column_names: ' + (stringify(columnNames)) + '\n  ' : ''}${_canReconfigure() ? 'column_types: ' + (stringify(columnTypes)) + '\n  ' : ''}delete_on_done: ${_deleteOnDone()}\n  check_header: ${headerOption}\n  chunk_size: ${_chunkSize()}\n  escapechar: ${_escapechar().charCodeAt}`);
  };

  const _canGoToNextPage = lift(_activePage, currentPage => ((currentPage.index + 1) * MaxItemsPerPage) < currentPage.columns.length);

  const _canGoToPreviousPage = lift(_activePage, currentPage => currentPage.index > 0);

  const goToNextPage = function() {
    const currentPage = _activePage();
    return _activePage(makePage(currentPage.index + 1, currentPage.columns));
  };

  const goToPreviousPage = function() {
    const currentPage = _activePage();
    if (currentPage.index > 0) {
      return _activePage(makePage(currentPage.index - 1, currentPage.columns));
    }
  };

  defer(_go);

  return {
    sourceKeys: _inputs[_inputKey],
    canReconfigure: _canReconfigure,
    parseTypes,
    dataTypes,
    delimiters: parseDelimiters,
    parseType: _parseType,
    delimiter: _delimiter,
    useSingleQuotes: _useSingleQuotes,
    escapechar: _escapechar,
    destinationKey: _destinationKey,
    headerOption: _headerOption,
    deleteOnDone: _deleteOnDone,
    columns: _visibleColumns,
    parseFiles,
    columnNameSearchTerm: _columnNameSearchTerm,
    canGoToNextPage: _canGoToNextPage,
    canGoToPreviousPage: _canGoToPreviousPage,
    goToNextPage,
    goToPreviousPage,
    template: 'flow-parse-raw-input'
  };
};


