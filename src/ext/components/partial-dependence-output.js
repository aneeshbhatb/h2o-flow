/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS202: Simplify dynamic range loops
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { defer, map, forEach } = require('lodash');
const { stringify } = require('../../core/modules/prelude');
const { rainbow } = require('../../core/modules/util');
const { react, lift, link, signal, signals } = require("../../core/modules/dataflow");

module.exports = function(_, _go, _result) {

  const _destinationKey = _result.destination_key;
  const _modelId = _result.model_id.name;
  const _frameId = _result.frame_id.name;
  const _isFrameShown = signal(false);

  const renderPlot = (target, render) => render(function(error, vis) {
    if (error) {
      return console.debug(error);
    } else {
      return target(vis.element);
    }
  });

  const plotPdp = (x, y, table) => _.plot(g => g(
    g.path(
      g.position(x, y),
      g.strokeColor(g.value('#1f77b4'))
    ),
    g.point(
      g.position(x, y),
      g.strokeColor(g.value('#1f77b4'))
    ),
    g.from(table)
  ));

  const fixColumnValues = function(result, name) {
    if (!(typeof result[name][0] === "string")) {
      const orig = result[name];
      result[name] = [];
      return __range__(0, orig.length-1, true).map((i) =>
        result[name].push(+orig[i]));
    }
  };

  const transform2dPdpData = function(data) {
    let i;
    let asc, end;
    let asc1, end1;
    const result = {
      x: [],
      x_domain: null,
      y: [],
      y_domain: null,
      z1: [],
      z2: [],
      z3: []
    };
    const first_val = data[0][0];
    let ts_len = 1;
    while (first_val === data[0][ts_len]) {
      ts_len++;
    }
    for (i = 0, end = ts_len-1, asc = 0 <= end; asc ? i <= end : i >= end; asc ? i++ : i--) {
      result.x.push(data[0][ts_len * i]);
      result.y.push(data[1][i]);
    }
    fixColumnValues(result, "x");
    fixColumnValues(result, "y");
    let z1_acc = [];
    let z2_acc = [];
    let z3_acc = [];
    for (i = 0, end1 = data[0].length-1, asc1 = 0 <= end1; asc1 ? i <= end1 : i >= end1; asc1 ? i++ : i--) {
      if ((i > 0) && ((i % ts_len) === 0)) {
        result.z1.push(z1_acc);
        z1_acc = [];
        result.z2.push(z2_acc);
        z2_acc = [];
        result.z3.push(z3_acc);
        z3_acc = [];
      }
      z1_acc.push(+data[2][i]);
      z2_acc.push((+data[2][i]) - (+data[3][i]));
      z3_acc.push((+data[2][i]) + (+data[3][i]));
    }
    result.z1.push(z1_acc);
    result.z2.push(z2_acc);
    result.z3.push(z3_acc);
    return result;
  };

  const getAxisType = function(series) {
    if (typeof series[0] === "string") {
      return "category";
    } else {
      return "linear";
    }
  };

  const plotPdp2d = response => _.plotlyPlot(plotly => (function(go) {
    const data = transform2dPdpData(response.data);
    const data1 = {
      x: data.x, y: data.y, z: data.z1,
      type: 'surface', opacity: 0.8, showscale: false,
      name: "partial dependence",
      contours: { x: { show: true }, y: { show: true } }
    };
    const data2 = {
      x: data.x, y: data.y, z: data.z2,
      type: 'surface', opacity: 0.4, showscale: false,
      name: "-dev",
      contours: { x: { show: true }, y: { show: true } }
    };
    const data3 = {
      x: data.x, y: data.y, z: data.z3,
      type: 'surface', opacity: 0.4, showscale: false,
      name: "+dev",
      contours: { x: { show: true }, y: { show: true } }
    };
    const layout = {
      width: 500, height: 400,
      margin: {
        l: 0, r: 0, t: 0, b: 0
      },
      scene: {
        xaxis: {
          title: { text: response.columns[0].description },
          type: getAxisType(data.x)
        },
        yaxis: {
          title: { text: response.columns[1].description },
          type: getAxisType(data.y)
        },
        zaxis: { title: { text: "Partial Dependence" } }
      }
    };
    const config =
      {displayModeBar: false};

    if (data.x_cat) {
      layout.scene.xaxis.type = "category";
    }
    if (data.y_cat) {
      layout.scene.yaxis.type = "category";
    }

    const elem = document.createElement('div');
    plotly.newPlot(elem, [data1, data2, data3], layout, config);

    const vis =
      {element: elem};
    return go(null, vis);
  }));

  const plotSingleClass = (_result, _plots) => (() => {
    const result = [];
    for (let i = 0; i < _result.partial_dependence_data.length; i++) {
      var table;
      const data = _result.partial_dependence_data[i];
      if (table = _.inspect(`plot${i+1}`, _result)) {
        var section;
        _plots.push(section = {
          title: data.description,
          plot: signal(null),
          frame: signal(null),
          isFrameShown: signal(false)
        }
        );

        if (!_result.cols || (i >= _result.cols.length)) {
          renderPlot(section.plot, plotPdp2d(data));
        } else {
          const x = data.columns[0].name;
          const y = data.columns[1].name;
          renderPlot(section.plot, plotPdp(x, y, table));
        }

        renderPlot(section.frame, _.plot(g => g(
          g.select(),
          g.from(table)
        ))
        );
        result.push(section.isFrameShown = lift(_isFrameShown, value => value));
      } else {
        result.push(undefined);
      }
    }
    return result;
  })();

  const toNumber = a => map(a, function(x) {
    if (x.toNumber) {
      return x.toNumber();
    } else {
      return x;
    }
  });

  const plotMultiClassPlot = (data, targets) => _.plotlyPlot(plotly => (function(go) {
    const plots = [];
    for (let j = 0, end = data.length, asc = 0 <= end; asc ? j < end : j > end; asc ? j++ : j--) {
      plots.push({
        x: toNumber(data[j].data[0]),
        y: toNumber(data[j].data[1]),
        type: 'lines+markers',
        name: targets[j]});
    }
    const layout = {
      width: 500, height: 400,
      margin: {
        l: 0, r: 0, t: 0, b: 0
      },
      legend: {
        y: 0.5
      },
      scene: {
        xaxis: {
          title: { text: data[0].columns[0].description },
          type: getAxisType(plots[0].x)
        },
        yaxis: {
          title: { text: data[0].columns[1].description },
          type: getAxisType(plots[0].y)
        }
      }
    };
    const config =
      {displayModeBar: false};

    const elem = document.createElement('div');
    plotly.newPlot(elem, plots, layout, config);
    const vis =
      {element: elem};
    return go(null, vis);
  }));

  const multiClassPlotTable = function(result, col, num_classes) {
    const tables = map(result.targets, (t, j) => _.inspect(`plot${(col*num_classes)+j+1}`, result));
    const merged = tables[0];
    merged.vectors[1].label = `${merged.vectors[1].label} ${result.targets[0]}`;
    for (let t = 1, end = num_classes, asc = 1 <= end; asc ? t < end : t > end; asc ? t++ : t--) {
      tables[t].vectors[1].label = `${tables[t].vectors[1].label} ${result.targets[t]}`;
      for (let v = 1, end1 = tables[t].vectors.length, asc1 = 1 <= end1; asc1 ? v < end1 : v > end1; asc1 ? v++ : v--) {
        merged.vectors.push(tables[t].vectors[v]);
      }
    }
    return merged;
  };

// getPartialDependence "pdp-9994ccb0-8eeb-409b-9909-b580e31a6768"
  const plotMultiClass = function(_result, _plots) {
    const num_cols = _result.cols.length;
    const num_classes = _result.targets.length;
    return (() => {
      const result = [];
      for (var i = 0, end = num_cols, asc = 0 <= end; asc ? i < end : i > end; asc ? i++ : i--) {
        var section;
        const data = _result.partial_dependence_data.slice(i*num_classes ,  (i+1)*num_classes);
        _plots.push(section = {
          title: `Partial Dependence Plot of column ${_result.cols[i]}`,
          plot: signal(null),
          frame: signal(null),
          isFrameShown: signal(false)
        }
        );
        renderPlot(section.plot, plotMultiClassPlot(data, _result.targets));
        renderPlot(section.frame, _.plot(g => g(
          g.select(),
          g.from(multiClassPlotTable(_result, i, num_classes))
        ))
        );
        result.push(section.isFrameShown = lift(_isFrameShown, value => value));
      }
      return result;
    })();
  };

  const _plots = []; // Hold as many plots as present in the result.
  if (_result.targets && (_result.targets.length > 1)) {
    plotMultiClass(_result, _plots);
  } else {
    plotSingleClass(_result, _plots);
  }

  const _viewFrame = () => _.insertAndExecuteCell('cs', `requestPartialDependenceData ${stringify(_destinationKey)}`);

  defer(_go);

  return {
    destinationKey: _destinationKey,
    modelId: _modelId,
    frameId: _frameId,
    plots: _plots,
    isFrameShown: _isFrameShown,
    viewFrame: _viewFrame,
    template: 'flow-partial-dependence-output'
  };
};


function __range__(left, right, inclusive) {
  let range = [];
  let ascending = left < right;
  let end = !inclusive ? right : ascending ? right + 1 : right - 1;
  for (let i = left; ascending ? i < end : i > end; ascending ? i++ : i--) {
    range.push(i);
  }
  return range;
}