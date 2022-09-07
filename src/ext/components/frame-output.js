/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { defer, throttle } = require('lodash');

const { stringify } = require('../../core/modules/prelude');
const { react, lift, link, signal, signals } = require("../../core/modules/dataflow");
const util = require('../../core/modules/util');

module.exports = function(_, _go, _frame) {
  const MaxItemsPerPage = 20;

  const _grid = signal(null);
  const _chunkSummary = signal(null);
  const _distributionSummary = signal(null);
  const _columnNameSearchTerm = signal(null);
  const _currentPage = signal(0);
  const _maxPages = signal(Math.ceil(_frame.total_column_count / MaxItemsPerPage));
  const _canGoToPreviousPage = lift(_currentPage, index => index > 0);
  const _canGoToNextPage = lift(_maxPages, _currentPage, (maxPages, index) => index < (maxPages - 1));

  const renderPlot = (container, render) => render(function(error, vis) {
    if (error) {
      return console.debug(error);
    } else {
      return container(vis.element);
    }
  });

  const renderGrid = render => render(function(error, vis) {
    if (error) {
      return console.debug(error);
    } else {
      $('a', vis.element).on('click', function(e) {
        const $a = $(e.target);
        switch ($a.attr('data-type')) {
          case 'summary-link':
            return _.insertAndExecuteCell('cs', `getColumnSummary ${stringify(_frame.frame_id.name)}, ${stringify($a.attr('data-key'))}`);
          case 'as-factor-link':
            return _.insertAndExecuteCell('cs', `changeColumnType frame: ${stringify(_frame.frame_id.name)}, column: ${stringify($a.attr('data-key'))}, type: 'enum'`);
          case 'as-numeric-link':
            return _.insertAndExecuteCell('cs', `changeColumnType frame: ${stringify(_frame.frame_id.name)}, column: ${stringify($a.attr('data-key'))}, type: 'int'`);
        }
      });

      return _grid(vis.element);
    }
  });

  const createModel = () => _.insertAndExecuteCell('cs', `assist buildModel, null, training_frame: ${stringify(_frame.frame_id.name)}`);

  const createAutoML = () => _.insertAndExecuteCell('cs', `assist runAutoML, training_frame: ${stringify(_frame.frame_id.name)}`);

  const inspect = () => _.insertAndExecuteCell('cs', `inspect getFrameSummary ${stringify(_frame.frame_id.name)}`);

  const inspectData = () => _.insertAndExecuteCell('cs', `getFrameData ${stringify(_frame.frame_id.name)}`);

  const splitFrame = () => _.insertAndExecuteCell('cs', `assist splitFrame, ${stringify(_frame.frame_id.name)}`);

  const predict = () => _.insertAndExecuteCell('cs', `predict frame: ${stringify(_frame.frame_id.name)}`);

  const download = () => window.open(_.ContextPath + `3/DownloadDataset?frame_id=${encodeURIComponent(_frame.frame_id.name)}`, '_blank');

  const exportFrame = () => _.insertAndExecuteCell('cs', `exportFrame ${stringify(_frame.frame_id.name)}`);

  const deleteFrame = () => _.confirm('Are you sure you want to delete this frame?', { acceptCaption: 'Delete Frame', declineCaption: 'Cancel' }, function(accept) {
    if (accept) {
      return _.insertAndExecuteCell('cs', `deleteFrame ${stringify(_frame.frame_id.name)}`);
    }
  });

  const renderFrame = function(frame) {
    renderGrid(_.plot(g => g(
      g.select(),
      g.from(_.inspect('columns', frame))
    ))
    );

    renderPlot(_chunkSummary, _.plot(g => g(
      g.select(),
      g.from(_.inspect('Chunk compression summary', frame))
    ))
    );

    return renderPlot(_distributionSummary, _.plot(g => g(
      g.select(),
      g.from(_.inspect('Frame distribution summary', frame))
    ))
    );
  };

  let _lastUsedSearchTerm = null; 
  const refreshColumns = function(pageIndex) {
    const searchTerm = _columnNameSearchTerm();
    if (searchTerm !== _lastUsedSearchTerm) {
      pageIndex = 0;
    }
       
    const startIndex = pageIndex * MaxItemsPerPage;
    const itemCount = (startIndex + MaxItemsPerPage) < _frame.total_column_count ? MaxItemsPerPage : _frame.total_column_count - startIndex;
    return _.requestFrameSummarySliceE(_frame.frame_id.name, searchTerm, startIndex, itemCount, function(error, frame) {
      if (error) {
        //TODO
      } else {
        _lastUsedSearchTerm = searchTerm;
        _currentPage(pageIndex);
        return renderFrame(frame);
      }
    });
  };
       
  const goToPreviousPage = function() {
    const currentPage = _currentPage();
    if (currentPage > 0) {
      refreshColumns(currentPage - 1);
    }
  };

  const goToNextPage = function() {
    const currentPage = _currentPage();
    if (currentPage < (_maxPages() - 1)) {
      refreshColumns(currentPage + 1);
    }
  };

  react(_columnNameSearchTerm, throttle(refreshColumns, 500));

  renderFrame(_frame);

  defer(_go);

  return {
    key: _frame.frame_id.name,
    rowCount: _frame.rows,
    columnCount: _frame.total_column_count,
    size: util.formatBytes(_frame.byte_size),
    chunkSummary: _chunkSummary,
    distributionSummary: _distributionSummary,
    columnNameSearchTerm: _columnNameSearchTerm,
    grid: _grid,
    inspect,
    createModel,
    createAutoML,
    inspectData,
    splitFrame,
    predict,
    download,
    exportFrame,
    canGoToPreviousPage: _canGoToPreviousPage,
    canGoToNextPage: _canGoToNextPage,
    goToPreviousPage,
    goToNextPage,
    deleteFrame,
    template: 'flow-frame-output'
  };
};

