/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { defer, throttle } = require('lodash');

const { react, lift, link, signal, signals } = require("../../core/modules/dataflow");

module.exports = function(_, _go, _frame) {
  const MaxItemsPerPage = 20;
  const _data = signal(null);
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

  const renderFrame = frame => renderPlot(_data, _.plot(g => g(
    g.select(),
    g.from(_.inspect('data', frame))
  ))
  );

  let _lastUsedSearchTerm = null; 
  const refreshColumns = function(pageIndex) {
    const searchTerm = _columnNameSearchTerm();
    if (searchTerm !== _lastUsedSearchTerm) {
      pageIndex = 0;
    }
    const startIndex = pageIndex * MaxItemsPerPage;
    const itemCount = (startIndex + MaxItemsPerPage) < _frame.total_column_count ? MaxItemsPerPage : _frame.total_column_count - startIndex;
    return _.requestFrameDataE(_frame.frame_id.name, searchTerm, startIndex, itemCount, function(error, frame) {
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
    data: _data,
    columnNameSearchTerm: _columnNameSearchTerm,
    canGoToPreviousPage: _canGoToPreviousPage,
    canGoToNextPage: _canGoToNextPage,
    goToPreviousPage,
    goToNextPage,
    template: 'flow-frame-data-output'
  };
};
