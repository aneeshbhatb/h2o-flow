/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { map, filter, defer, head, join, find, escape, last } = require('lodash');

const Mousetrap = require('mousetrap');
window.Mousetrap = Mousetrap;
require('mousetrap/plugins/global-bind/mousetrap-global-bind');

const { react, link, signal, signals } = require("../modules/dataflow");
const { stringify } = require('../modules/prelude');

let status = require('./status');
const sidebar = require('./sidebar');
status = require('./status');
const about = require('./about');
const dialogs = require('../modules/dialogs');
const Cell = require('./cell');
const util = require('../modules/util');
const fileOpenDialog = require('../../ext/components/file-open-dialog');
const fileUploadDialog = require('../../ext/components/file-upload-dialog');

exports.init = function(_, _renderers) {
  const _localName = signal('Untitled Flow');
  react(_localName, name => document.title = 'H2O' + (name && name.trim() ? `- ${name}` : ''));

  const _remoteName = signal(null);

  const _isEditingName = signal(false);
  const editName = () => _isEditingName(true);
  const saveName = () => _isEditingName(false);

  const _cells = signals([]);
  let _selectedCell = null;
  let _selectedCellIndex = -1;
  let _clipboardCell = null;
  let _lastDeletedCell = null;
  const _areInputsHidden = signal(false);
  const _areOutputsHidden = signal(false);
  const _isSidebarHidden = signal(false);
  const _isRunningAll = signal(false);
  const _runningCaption = signal('Running');
  const _runningPercent = signal('0%');
  const _runningCellInput = signal('');
  const _status = status.init(_);
  const _sidebar = sidebar.init(_, _cells);
  const _about = about.init(_);
  const _dialogs = dialogs.init(_);

  // initialize the interpreter when the notebook is created
  // one interpreter is shared by all scala cells
  const _initializeInterpreter = () => _.requestScalaIntp(function(error,response) {
    if (error) {
      // Handle the error
      _.scalaIntpId(-1);
      return _.scalaIntpAsync(false);
    } else {
      _.scalaIntpId(response.session_id);
      return _.scalaIntpAsync(response.async);
    }
  });

  const sanitizeCellInput = cellInput => cellInput.replace(/\"password\":\"[^\"]*\"/g, "\"password\":\"\"");

  const serialize = function() {
    const cells = Array.from(_cells()).map((cell) => ({
      type: cell.type(),
      input: sanitizeCellInput(cell.input())
    }));

    return {
      version: '1.0.0',
      cells
    };
  };

  const deserialize = function(localName, remoteName, doc) {
    _localName(localName);
    _remoteName(remoteName);

    const cells = Array.from(doc.cells).map((cell) =>
      createCell(cell.type, cell.input));
    _cells(cells);

    selectCell(head(cells));

    // Execute all non-code cells (headings, markdown, etc.)
    for (let c of Array.from(_cells())) {
      if (!c.isCode()) { c.execute(); }
    }

  };

  var createCell = function(type, input) {
    if (type == null) { type = 'cs'; }
    if (input == null) { input = ''; }
    return Cell(_, _renderers, type, input);
  };

  const checkConsistency = function() {
    let selectionCount = 0;
    const iterable = _cells();
    for (let i = 0; i < iterable.length; i++) {
      const cell = iterable[i];
      if (!cell) {
        error(`index ${i} is empty`);
      } else {
        if (cell.isSelected()) {
          selectionCount++;
        }
      }
    }
    if (selectionCount !== 1) { error(`selected cell count = ${selectionCount}`); }
  };

  var selectCell = function(target, scrollIntoView, scrollImmediately) {
    if (scrollIntoView == null) { scrollIntoView = true; }
    if (scrollImmediately == null) { scrollImmediately = false; }
    if (_selectedCell === target) { return; }
    if (_selectedCell) { _selectedCell.isSelected(false); }
    _selectedCell = target;
    //TODO also set focus so that tabs don't jump to the first cell
    _selectedCell.isSelected(true);
    _selectedCellIndex = _cells.indexOf(_selectedCell);
    checkConsistency();
    if (scrollIntoView) {
      defer(() => _selectedCell.scrollIntoView(scrollImmediately));
    }
    return _selectedCell;
  };

  const cloneCell = cell => createCell(cell.type(), cell.input());

  const switchToCommandMode = () => _selectedCell.isActive(false);

  const switchToEditMode = function() {
    _selectedCell.isActive(true);
    return false;
  };

  const convertCellToCode = () => _selectedCell.type('cs');

  const convertCellToHeading = level => (function() {
    _selectedCell.type(`h${level}`);
    return _selectedCell.execute();
  });

  const convertCellToMarkdown = function() {
    _selectedCell.type('md');
    return _selectedCell.execute();
  };

  const convertCellToRaw = function() {
    _selectedCell.type('raw');
    return _selectedCell.execute();
  };

  const convertCellToScala = () => _selectedCell.type('sca');

  const copyCell = () => _clipboardCell = _selectedCell;

  const cutCell = function() {
    copyCell();
    return removeCell();
  };

  const deleteCell = function() {
    _lastDeletedCell = _selectedCell;
    return removeCell();
  };

  var removeCell = function() {
    const cells = _cells();
    if (cells.length > 1) {
      let removedCell;
      if (_selectedCellIndex === (cells.length - 1)) {
        //TODO call dispose() on this cell
        removedCell = head(_cells.splice(_selectedCellIndex, 1));
        selectCell(cells[_selectedCellIndex - 1]);
      } else {
        //TODO call dispose() on this cell
        removedCell = head(_cells.splice(_selectedCellIndex, 1));
        selectCell(cells[_selectedCellIndex]);
      }
      if (removedCell) { _.saveClip('trash', removedCell.type(), removedCell.input()); }
    }
  };

  const insertCell = function(index, cell) {
    _cells.splice(index, 0, cell);
    selectCell(cell);
    return cell;
  };

  const insertAbove = cell => insertCell(_selectedCellIndex, cell);

  const insertBelow = cell => insertCell(_selectedCellIndex + 1, cell);

  const appendCell = cell => insertCell(_cells().length, cell);

  const insertCellAbove = (type, input) => insertAbove(createCell(type, input));

  const insertCellBelow = (type, input) => insertBelow(createCell(type, input));

  const insertNewCellAbove = () => insertAbove(createCell('cs'));

  const insertNewCellBelow = () => insertBelow(createCell('cs'));

  const insertNewScalaCellAbove = () => insertAbove(createCell('sca'));

  const insertNewScalaCellBelow = () => insertBelow(createCell('sca'));

  const insertCellAboveAndRun = function(type, input) {
    const cell = insertAbove(createCell(type, input));
    cell.execute();
    return cell;
  };

  const insertCellBelowAndRun = function(type, input) {
    const cell = insertBelow(createCell(type, input));
    cell.execute();
    return cell;
  };

  const appendCellAndRun = function(type, input) {
    const cell = appendCell(createCell(type, input));
    cell.execute();
    return cell;
  };


  const moveCellDown = function() {
    const cells = _cells();
    if (_selectedCellIndex !== (cells.length - 1)) {
      _cells.splice(_selectedCellIndex, 1);
      _selectedCellIndex++;
      _cells.splice(_selectedCellIndex, 0, _selectedCell);
    }
  };

  const moveCellUp = function() {
    if (_selectedCellIndex !== 0) {
      _cells.splice(_selectedCellIndex, 1);
      _selectedCellIndex--;
      _cells.splice(_selectedCellIndex, 0, _selectedCell);
    }
  };

  const mergeCellBelow = function() {
    const cells = _cells();
    if (_selectedCellIndex !== (cells.length - 1)) {
      const nextCell = cells[_selectedCellIndex + 1];
      if (_selectedCell.type() === nextCell.type()) {
        nextCell.input(_selectedCell.input() + '\n' + nextCell.input());
        removeCell();
      }
    }
  };

  const splitCell = function() {
    if (_selectedCell.isActive()) {
      const input = _selectedCell.input();
      if (input.length > 1) {
        const cursorPosition = _selectedCell.getCursorPosition();
        if (0 < cursorPosition && cursorPosition < input.length - 1) {
          const left = substr(input, 0, cursorPosition);
          const right = substr(input, cursorPosition);
          _selectedCell.input(left);
          insertCell(_selectedCellIndex + 1, createCell('cs', right));
          _selectedCell.isActive(true);
        }
      }
    }
  };

  const pasteCellAbove = function() {
    if (_clipboardCell) { return insertCell(_selectedCellIndex, cloneCell(_clipboardCell)); }
  };

  const pasteCellBelow = function() {
    if (_clipboardCell) { return insertCell(_selectedCellIndex + 1, cloneCell(_clipboardCell)); }
  };

  const undoLastDelete = function() {
    if (_lastDeletedCell) { insertCell(_selectedCellIndex + 1, _lastDeletedCell); }
    return _lastDeletedCell = null;
  };

  const runCell = function() {
    _selectedCell.execute();
    return false;
  };

  const runCellAndInsertBelow = function() {
    _selectedCell.execute(() => insertNewCellBelow());
    return false;
  };

  //TODO ipython has inconsistent behavior here. seems to be doing runCellAndInsertBelow if executed on the lowermost cell.
  const runCellAndSelectBelow = function() {
    _selectedCell.execute(() => selectNextCell());
    return false;
  };

  const checkIfNameIsInUse = (name, go) => _.requestObjectExists('notebook', name, (error, exists) => go(exists));

  const storeNotebook = (localName, remoteName) => _.requestPutObject('notebook', localName, serialize(), function(error) {
    if (error) {
      return _.alert(`Error saving notebook: ${error.message}`);
    } else {
      _remoteName(localName);
      _localName(localName);
      if (remoteName !== localName) { // renamed document
        return _.requestDeleteObject('notebook', remoteName, function(error) {
          if (error) {
            _.alert(`Error deleting remote notebook [${remoteName}]: ${error.message}`);
          }
          return _.saved();
        });
      } else {
        return _.saved();
      }
    }
  });

  const saveNotebook = function() {
    const localName = util.sanitizeName(_localName());
    if (localName === '') { return _.alert('Invalid notebook name.'); }

    const remoteName = _remoteName();
    if (remoteName) { // saved document
      storeNotebook(localName, remoteName);
    } else { // unsaved document
      checkIfNameIsInUse(localName, function(isNameInUse) {
        if (isNameInUse) {
          return _.confirm("A notebook with that name already exists.\nDo you want to replace it with the one you're saving?", { acceptCaption: 'Replace', declineCaption: 'Cancel' }, function(accept) {
            if (accept) {
              return storeNotebook(localName, remoteName);
            }
          });
        } else {
          return storeNotebook(localName, remoteName);
        }
      });
    }
  };

  const promptForNotebook = () => _.dialog(fileOpenDialog, function(result) {
    if (result) {
      const { error, filename } = result;
      if (error) {
        return _.growl(error.message != null ? error.message : error);
      } else {
        loadNotebook(filename);
        return _.loaded();
      }
    }
  });

  const uploadFile = () => _.dialog(fileUploadDialog, function(result) {
    if (result) {
      const { error } = result;
      if (error) {
        return _.growl(error.message != null ? error.message : error);
      } else {
        _.growl('File uploaded successfully!');
        return _.insertAndExecuteCell('cs', `setupParse source_frames: [ ${stringify(result.result.destination_frame) }]`);
      }
    }
  });

  const toggleInput = () => _selectedCell.toggleInput();

  const toggleOutput = () => _selectedCell.toggleOutput();

  const toggleAllInputs = function() {
    const wereHidden = _areInputsHidden();
    _areInputsHidden(!wereHidden);
    //
    // If cells are generated while inputs are hidden, the input boxes
    //   do not resize to fit contents. So explicitly ask all cells
    //   to resize themselves.
    //
    if (wereHidden) {
      for (let cell of Array.from(_cells())) {
        cell.autoResize();
      }
    }
  };

  const toggleAllOutputs = () => _areOutputsHidden(!_areOutputsHidden());

  const toggleSidebar = () => _isSidebarHidden(!_isSidebarHidden());

  const showBrowser = function() {
    _isSidebarHidden(false);
    return _.showBrowser();
  };

  const showOutline = function() {
    _isSidebarHidden(false);
    return _.showOutline();
  };

  const showClipboard = function() {
    _isSidebarHidden(false);
    return _.showClipboard();
  };

  var selectNextCell = function() {
    const cells = _cells();
    if (_selectedCellIndex !== (cells.length - 1)) {
      selectCell(cells[_selectedCellIndex + 1]);
    }
    return false; // prevent arrow keys from scrolling the page
  };

  const selectPreviousCell = function() {
    if (_selectedCellIndex !== 0) {
      const cells = _cells();
      selectCell(cells[_selectedCellIndex - 1]);
    }
    return false; // prevent arrow keys from scrolling the page
  };

  const displayKeyboardShortcuts = () => $('#keyboardHelpDialog').modal();

  const findBuildProperty = function(caption) {
    if (_.BuildProperties) {
      let entry;
      if ((entry = (find(_.BuildProperties, entry => entry.caption === caption)))) {
        return entry.value;
      } else {
        return undefined;
      }
    } else {
      return undefined;
    }
  };


  const getBuildProperties = function() {
    const projectVersion = findBuildProperty('H2O Build project version');
    return [
      findBuildProperty('H2O Build git branch'),
      projectVersion,
      projectVersion ? last(projectVersion.split('.')) : undefined,
      (findBuildProperty('H2O Build git hash')) || 'master'
    ];
  };

  const displayDocumentation = function() {
    const [ gitBranch, projectVersion, buildVersion, gitHash ] = Array.from(getBuildProperties());

    if (buildVersion && (buildVersion !== '99999')) {
      return window.open(`http://h2o-release.s3.amazonaws.com/h2o/${gitBranch}/${buildVersion}/docs-website/h2o-docs/index.html`, '_blank');
    } else {
      return window.open(`https://github.com/h2oai/h2o-3/blob/${gitHash}/h2o-docs/src/product/flow/README.md`, '_blank');
    }
  };

  const displayFAQ = function() {
    const [ gitBranch, projectVersion, buildVersion, gitHash ] = Array.from(getBuildProperties());

    if (buildVersion && (buildVersion !== '99999')) {
      return window.open(`http://h2o-release.s3.amazonaws.com/h2o/${gitBranch}/${buildVersion}/docs-website/h2o-docs/index.html`, '_blank');
    } else {
      return window.open(`https://github.com/h2oai/h2o-3/blob/${gitHash}/h2o-docs/src/product/howto/FAQ.md`, '_blank');
    }
  };

  const executeCommand = command => () => _.insertAndExecuteCell('cs', command);

  const displayAbout = () => $('#aboutDialog').modal();

  const shutdown = () => _.requestShutdown(function(error, result) {
    if (error) {
      return _.growl(`Shutdown failed: ${error.message}`, 'danger');
    } else {
      return _.growl('Shutdown complete!', 'warning');
    }
  });


  const showHelp = function() {
    _isSidebarHidden(false);
    return _.showHelp();
  };

  const createNotebook = () => _.confirm('This action will replace your active notebook.\nAre you sure you want to continue?', { acceptCaption: 'Create New Notebook', declineCaption: 'Cancel' }, function(accept) {
    if (accept) {
      const currentTime = (new Date()).getTime();
      return deserialize('Untitled Flow', null, {
        cells: [{
          type: 'cs',
          input: ''
        }
        ]
      });
    }
});

  const duplicateNotebook = () => deserialize(`Copy of ${_localName()}`, null, serialize());

  const openNotebook = (name, doc) => deserialize(name, null, doc);

  var loadNotebook = name => _.requestObject('notebook', name, function(error, doc) {
    if (error) {
      return _.alert(error.message != null ? error.message : error);
    } else {
      return deserialize(name, name, doc);
    }
  });

  const exportNotebook = function() {
    let remoteName;
    if ((remoteName = _remoteName())) {
      return window.open(_.ContextPath + `3/NodePersistentStorage.bin/notebook/${remoteName}`, '_blank');
    } else {
      return _.alert("Please save this notebook before exporting.");
    }
  };

  const goToH2OUrl = url => () => window.open(_.ContextPath + url, '_blank');

  const goToUrl = url => () => window.open(url, '_blank');

  const executeAllCells = function(fromBeginning, go) {
    _isRunningAll(true);

    let cells = _cells().slice(0);
    const cellCount = cells.length;
    let cellIndex = 0;

    if (!fromBeginning) {
      cells = cells.slice(_selectedCellIndex);
      cellIndex = _selectedCellIndex;
    }

    var executeNextCell = function() {
      if (_isRunningAll()) { // will be false if user-aborted
        const cell = cells.shift();
        if (cell) {
          // Scroll immediately without affecting selection state.
          cell.scrollIntoView(true);

          cellIndex++;
          _runningCaption(`Running cell ${cellIndex} of ${cellCount}`);
          _runningPercent(`${Math.floor((100 * cellIndex)/cellCount)}%`);
          _runningCellInput(cell.input());

          //TODO Continuation should be EFC, and passing an error should abort 'run all'
          return cell.execute(function(errors) {
            if (errors) {
              return go('failed', errors);
            } else {
              return executeNextCell();
            }
          });
        } else {
          return go('done');
        }
      } else {
        return go('aborted');
      }
    };

    return executeNextCell();
  };

  const runAllCells = function(fromBeginning) {
    if (fromBeginning == null) { fromBeginning = true; }
    return executeAllCells(fromBeginning, function(status) {
      _isRunningAll(false);
      switch (status) {
        case 'aborted':
          return _.growl('Stopped running your flow.', 'warning');
        case 'failed':
          return _.growl('Failed running your flow.', 'danger');
        default: // 'done'
          return _.growl('Finished running your flow!', 'success');
      }
    });
  };

  const continueRunningAllCells = () => runAllCells(false);

  const stopRunningAll = () => _isRunningAll(false);

  const clearCell = function() {
    _selectedCell.clear();
    return _selectedCell.autoResize();
  };

  const clearAllCells = function() {
    for (let cell of Array.from(_cells())) {
      cell.clear();
      cell.autoResize();
    }
  };

  const notImplemented = function() {}; // noop
  const pasteCellandReplace = notImplemented;
  const mergeCellAbove = notImplemented;
  const startTour = notImplemented;

  //
  // Top menu bar
  //

  const createMenu = (label, items) => ({
    label,
    items
  });

  const createMenuHeader = label => ({
    label,
    action: null
  });

  const createShortcutHint = shortcut => "<span style='float:right'>" + (map(shortcut, key => `<kbd>${ key }</kbd>`)).join(' ') + "</span>";

  const createMenuItem = function(label, action, shortcut) {
    const kbds = shortcut ?
      createShortcutHint(shortcut)
    :
      '';

    return {
      label: `${ escape(label) }${ kbds }`,
      action
    };
  };

  const menuDivider = {label: null, action: null};

  const _menus = signal(null);

  let menuCell = [
        createMenuItem('Run Cell', runCell, ['ctrl', 'enter']),
        menuDivider,
        createMenuItem('Cut Cell', cutCell, ['x']),
        createMenuItem('Copy Cell', copyCell, ['c']),
        createMenuItem('Paste Cell Above', pasteCellAbove, ['shift', 'v']),
        createMenuItem('Paste Cell Below', pasteCellBelow, ['v']),
        //TODO createMenuItem 'Paste Cell and Replace', pasteCellandReplace, yes
        createMenuItem('Delete Cell', deleteCell, ['d', 'd']),
        createMenuItem('Undo Delete Cell', undoLastDelete, ['z']),
        menuDivider,
        createMenuItem('Move Cell Up', moveCellUp, ['ctrl', 'k']),
        createMenuItem('Move Cell Down', moveCellDown, ['ctrl', 'j']),
        menuDivider,
        createMenuItem('Insert Cell Above', insertNewCellAbove, ['a']),
        createMenuItem('Insert Cell Below', insertNewCellBelow, ['b']),
        //TODO createMenuItem 'Split Cell', splitCell
        //TODO createMenuItem 'Merge Cell Above', mergeCellAbove, yes
        //TODO createMenuItem 'Merge Cell Below', mergeCellBelow
        menuDivider,
        createMenuItem('Toggle Cell Input', toggleInput),
        createMenuItem('Toggle Cell Output', toggleOutput, ['o']),
        createMenuItem('Clear Cell Output', clearCell)
        ];

  const menuCellSW = [
        menuDivider,
        createMenuItem('Insert Scala Cell Above', insertNewScalaCellAbove),
        createMenuItem('Insert Scala Cell Below', insertNewScalaCellBelow)
        ];
  if (_.onSparklingWater) {
    menuCell = [...Array.from(menuCell), ...Array.from(menuCellSW)];
  }

  const initializeMenus = function(builders) {
    const mojoModelMenuItem = builders
      .filter(builder => builder.algo === "generic")
      .map(builder => createMenuItem(builder.algo_full_name, executeCommand(`buildModel ${stringify(builder.algo)}`)));
    const builderMenuItems = builders
      .filter(builder => builder.algo !== "generic")
      .map(builder => createMenuItem(`${ builder.algo_full_name }...`, executeCommand(`buildModel ${stringify(builder.algo)}`)));
    let modelMenuItems = [
        createMenuItem('Run AutoML...', executeCommand('runAutoML')),
        menuDivider
    ];
    modelMenuItems = modelMenuItems.concat(builderMenuItems);
    modelMenuItems = modelMenuItems.concat([ menuDivider ]);
    modelMenuItems = modelMenuItems.concat(mojoModelMenuItem);
    modelMenuItems = modelMenuItems.concat([
      createMenuItem('List All Models', executeCommand('getModels')),
      createMenuItem('List Grid Search Results', executeCommand('getGrids')),
      createMenuItem('Import Model...', executeCommand('importModel')),
      createMenuItem('Export Model...', executeCommand('exportModel'))
    ]);

    return [
      createMenu('Flow', [
        createMenuItem('New Flow', createNotebook),
        createMenuItem('Open Flow...', promptForNotebook),
        createMenuItem('Save Flow', saveNotebook, ['s']),
        createMenuItem('Make a Copy...', duplicateNotebook),
        menuDivider,
        createMenuItem('Run All Cells', runAllCells),
        createMenuItem('Run All Cells Below', continueRunningAllCells),
        menuDivider,
        createMenuItem('Toggle All Cell Inputs', toggleAllInputs),
        createMenuItem('Toggle All Cell Outputs', toggleAllOutputs),
        createMenuItem('Clear All Cell Outputs', clearAllCells),
        menuDivider,
        createMenuItem('Download this Flow...', exportNotebook)
      ])
    ,
      createMenu('Cell', menuCell)
    ,
      createMenu('Data', [
        createMenuItem('Import Files...', executeCommand('importFiles')),
        createMenuItem('Import SQL Table...', executeCommand('importSqlTable')),
        createMenuItem('Upload File...', uploadFile),
        createMenuItem('Split Frame...', executeCommand('splitFrame')),
        createMenuItem('Merge Frames...', executeCommand('mergeFrames')),
        menuDivider,
        createMenuItem('List All Frames', executeCommand('getFrames')),
        menuDivider,
        createMenuItem('Impute...', executeCommand('imputeColumn'))
        //TODO Quantiles
        //TODO Interaction
      ])
    ,
      createMenu('Model', modelMenuItems)
    ,
      createMenu('Score', [
        createMenuItem('Predict...', executeCommand('predict')),
        createMenuItem('Partial Dependence Plots...', executeCommand('buildPartialDependence')),
        menuDivider,
        createMenuItem('List All Predictions', executeCommand('getPredictions'))
        //TODO Confusion Matrix
        //TODO AUC
        //TODO Hit Ratio
        //TODO PCA Score
        //TODO Gains/Lift Table
        //TODO Multi-model Scoring
      ])
    ,
      createMenu('Admin', [
        createMenuItem('Jobs', executeCommand('getJobs')),
        createMenuItem('Cluster Status', executeCommand('getCloud')),
        createMenuItem('Water Meter (CPU meter)', goToH2OUrl('perfbar.html')),
        menuDivider,
        createMenuHeader('Inspect Log'),
        createMenuItem('View Log', executeCommand('getLogFile')),
        createMenuItem('Download Logs', goToH2OUrl('3/Logs/download')),
        menuDivider,
        createMenuHeader('Advanced'),
        createMenuItem('Download Gen Model', goToH2OUrl('3/h2o-genmodel.jar')),
        createMenuItem('Create Synthetic Frame...', executeCommand('createFrame')),
        createMenuItem('Stack Trace', executeCommand('getStackTrace')),
        createMenuItem('Network Test', executeCommand('testNetwork')),
        //TODO Cluster I/O
        createMenuItem('Profiler', executeCommand('getProfile depth: 10')),
        createMenuItem('Timeline', executeCommand('getTimeline')),
        //TODO UDP Drop Test
        //TODO Task Status
        createMenuItem('Shut Down', shutdown)
      ])
    ,
      createMenu('Help', [
        //TODO createMenuItem 'Tour', startTour, yes
        createMenuItem('Assist Me', executeCommand('assist')),
        menuDivider,
        createMenuItem('Contents', showHelp),
        createMenuItem('Keyboard Shortcuts', displayKeyboardShortcuts, ['h']),
        menuDivider,
        createMenuItem('Documentation', displayDocumentation),
        createMenuItem('FAQ', displayFAQ),
        createMenuItem('H2O.ai', goToUrl('http://h2o.ai/')),
        createMenuItem('H2O on Github', goToUrl('https://github.com/h2oai/h2o-3')),
        createMenuItem('Report an issue', goToUrl('http://jira.h2o.ai')),
        createMenuItem('Forum / Ask a question', goToUrl('https://groups.google.com/d/forum/h2ostream')),
        menuDivider,
        //TODO Tutorial Flows
        createMenuItem('About', displayAbout)
      ])
    ];
  };

  const setupMenus = () => _.requestModelBuilders((error, builders) => _menus(initializeMenus(error ? [] : builders)));

  const createTool = function(icon, label, action, isDisabled) {
    if (isDisabled == null) { isDisabled = false; }
    return {
      label,
      action,
      isDisabled,
      icon: `fa fa-${icon}`
    };
  };

  const _toolbar = [
    [
      createTool('file-o', 'New', createNotebook),
      createTool('folder-open-o', 'Open', promptForNotebook),
      createTool('save', 'Save (s)', saveNotebook)
    ]
  ,
    [
      createTool('plus', 'Insert Cell Below (b)', insertNewCellBelow),
      createTool('arrow-up', 'Move Cell Up (ctrl+k)', moveCellUp),
      createTool('arrow-down', 'Move Cell Down (ctrl+j)', moveCellDown)
    ]
  ,
    [
      createTool('cut', 'Cut Cell (x)', cutCell),
      createTool('copy', 'Copy Cell (c)', copyCell),
      createTool('paste', 'Paste Cell Below (v)', pasteCellBelow),
      createTool('eraser', 'Clear Cell', clearCell),
      createTool('trash-o', 'Delete Cell (d d)', deleteCell)
    ]
  ,
    [
      createTool('step-forward', 'Run and Select Below', runCellAndSelectBelow),
      createTool('play', 'Run (ctrl+enter)', runCell),
      createTool('forward', 'Run All', runAllCells)
    ]
  ,
    [
      createTool('question-circle', 'Assist Me', executeCommand('assist'))
    ]
  ];

  // (From IPython Notebook keyboard shortcuts dialog)
  // The IPython Notebook has two different keyboard input modes. Edit mode allows you to type code/text into a cell and is indicated by a green cell border. Command mode binds the keyboard to notebook level actions and is indicated by a grey cell border.
  //
  // Command Mode (press Esc to enable)
  //
  const normalModeKeyboardShortcuts = [
    [ 'enter', 'edit mode', switchToEditMode ],
    //[ 'shift+enter', 'run cell, select below', runCellAndSelectBelow ]
    //[ 'ctrl+enter', 'run cell', runCell ]
    //[ 'alt+enter', 'run cell, insert below', runCellAndInsertBelow ]
    [ 'y', 'to code', convertCellToCode ],
    [ 'm', 'to markdown', convertCellToMarkdown ],
    [ 'r', 'to raw', convertCellToRaw ],
    [ '1', 'to heading 1', convertCellToHeading(1) ],
    [ '2', 'to heading 2', convertCellToHeading(2) ],
    [ '3', 'to heading 3', convertCellToHeading(3) ],
    [ '4', 'to heading 4', convertCellToHeading(4) ],
    [ '5', 'to heading 5', convertCellToHeading(5) ],
    [ '6', 'to heading 6', convertCellToHeading(6) ],
    [ 'up', 'select previous cell', selectPreviousCell ],
    [ 'down', 'select next cell', selectNextCell ],
    [ 'k', 'select previous cell', selectPreviousCell ],
    [ 'j', 'select next cell', selectNextCell ],
    [ 'ctrl+k', 'move cell up', moveCellUp ],
    [ 'ctrl+j', 'move cell down', moveCellDown ],
    [ 'a', 'insert cell above', insertNewCellAbove ],
    [ 'b', 'insert cell below', insertNewCellBelow ],
    [ 'x', 'cut cell', cutCell ],
    [ 'c', 'copy cell', copyCell ],
    [ 'shift+v', 'paste cell above', pasteCellAbove ],
    [ 'v', 'paste cell below', pasteCellBelow ],
    [ 'z', 'undo last delete', undoLastDelete ],
    [ 'd d', 'delete cell (press twice)', deleteCell ],
    [ 'shift+m', 'merge cell below', mergeCellBelow ],
    [ 's', 'save notebook', saveNotebook ],
    //[ 'mod+s', 'save notebook', saveNotebook ]
    // [ 'l', 'toggle line numbers' ]
    [ 'o', 'toggle output', toggleOutput ],
    // [ 'shift+o', 'toggle output scrolling' ]
    [ 'h', 'keyboard shortcuts', displayKeyboardShortcuts ]
    // [ 'i', 'interrupt kernel (press twice)' ]
    // [ '0', 'restart kernel (press twice)' ]
  ];

  if (_.onSparklingWater) {
    normalModeKeyboardShortcuts.push([ 'q', 'to Scala', convertCellToScala ]);
  }



  //
  // Edit Mode (press Enter to enable)
  //
  const editModeKeyboardShortcuts = [
    // Tab : code completion or indent
    // Shift-Tab : tooltip
    // Cmd-] : indent
    // Cmd-[ : dedent
    // Cmd-a : select all
    // Cmd-z : undo
    // Cmd-Shift-z : redo
    // Cmd-y : redo
    // Cmd-Up : go to cell start
    // Cmd-Down : go to cell end
    // Opt-Left : go one word left
    // Opt-Right : go one word right
    // Opt-Backspace : del word before
    // Opt-Delete : del word after
    [ 'esc', 'command mode', switchToCommandMode ],
    [ 'ctrl+m', 'command mode', switchToCommandMode ],
    [ 'shift+enter', 'run cell, select below', runCellAndSelectBelow ],
    [ 'ctrl+enter', 'run cell', runCell ],
    [ 'alt+enter', 'run cell, insert below', runCellAndInsertBelow ],
    [ 'ctrl+shift+-', 'split cell', splitCell ],
    [ 'mod+s', 'save notebook', saveNotebook ]
  ];

  const toKeyboardHelp = function(shortcut) {
    const [ seq, caption ] = Array.from(shortcut);
    const keystrokes = (map(seq.split(/\+/g), key => `<kbd>${key}</kbd>`)).join(' ');
    return {
      keystrokes,
      caption
    };
  };

  const normalModeKeyboardShortcutsHelp = map(normalModeKeyboardShortcuts, toKeyboardHelp);
  const editModeKeyboardShortcutsHelp = map(editModeKeyboardShortcuts, toKeyboardHelp);

  const setupKeyboardHandling = function(mode) {
    let caption, f, shortcut;
    for ([ shortcut, caption, f ] of Array.from(normalModeKeyboardShortcuts)) {
      Mousetrap.bind(shortcut, f);
    }

    for ([ shortcut, caption, f ] of Array.from(editModeKeyboardShortcuts)) {
      Mousetrap.bindGlobal(shortcut, f);
    }

  };

  const initialize = function() {
    setupKeyboardHandling('normal');

    setupMenus();

    link(_.load, loadNotebook);
    link(_.open, openNotebook);

    link(_.selectCell, selectCell);

    link(_.executeAllCells, executeAllCells);

    link(_.insertAndExecuteCell, (type, input) => defer(appendCellAndRun, type, input));

    link(_.insertCell, (type, input) => defer(insertCellBelow, type, input));

    link(_.saved, () => _.growl('Notebook saved.'));

    link(_.loaded, () => _.growl('Notebook loaded.'));

    ((executeCommand('assist')))();

    _.setDirty(); //TODO setPristine() when autosave is implemented.
    if (_.onSparklingWater) {
      return _initializeInterpreter();
    }
  };

  link(_.ready, initialize);

  return {
    name: _localName,
    isEditingName: _isEditingName,
    editName,
    saveName,
    menus: _menus,
    sidebar: _sidebar,
    status: _status,
    toolbar: _toolbar,
    cells: _cells,
    areInputsHidden: _areInputsHidden,
    areOutputsHidden: _areOutputsHidden,
    isSidebarHidden: _isSidebarHidden,
    isRunningAll: _isRunningAll,
    runningCaption: _runningCaption,
    runningPercent: _runningPercent,
    runningCellInput: _runningCellInput,
    stopRunningAll,
    toggleSidebar,
    shortcutsHelp: {
      normalMode: normalModeKeyboardShortcutsHelp,
      editMode: editModeKeyboardShortcutsHelp
    },
    about: _about,
    dialogs: _dialogs,
    templateOf(view) { return view.template; }
  };
};
