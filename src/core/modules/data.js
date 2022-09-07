/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS202: Simplify dynamic range loops
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
//
// Insane hack to compress large 2D data tables.
// The basis for doing this is described here:
// http://www.html5rocks.com/en/tutorials/speed/v8/
// See Tip #1 "Hidden Classes"
//
// Applies to IE as well:
// http://msdn.microsoft.com/en-us/library/windows/apps/hh781219.aspx#optimize_property_access
//
// http://jsperf.com/big-data-matrix/3
// As of 31 Oct 2014, for a 10000 row, 100 column table in Chrome,
//   retained memory sizes:
// raw json: 31,165 KB
// array of objects: 41,840 KB
// array of arrays: 14,960 KB
// array of prototyped instances: 14,840 KB
//
// Usage:
// Foo = Flow.Data.createCompiledPrototype [ 'bar', 'baz', 'qux', ... ]
// foo = new Foo()
//

const { stringify } = require('../../core/modules/prelude');
const { TNumber, TFactor } = require('../../core/modules/types');
const { uniqueId, identity } = require('lodash');

let _prototypeId = 0;
const nextPrototypeName = () => `Map${++_prototypeId}`;
const _prototypeCache = {};
const createCompiledPrototype = function(attrs) {
  // Since the prototype depends only on attribute names,
  //  return a cached prototype, if any.
  let proto;
  let i;
  const cacheKey = attrs.join('\0');
  if (proto = _prototypeCache[cacheKey]) { return proto; }

  const params = ((() => {
    let asc, end;
    const result = [];
     for (i = 0, end = attrs.length, asc = 0 <= end; asc ? i < end : i > end; asc ? i++ : i--) {
      result.push(`a${i}`);
    } 
    return result;
  })());
  const inits = ((() => {
    const result1 = [];
     for (i = 0; i < attrs.length; i++) {
      const attr = attrs[i];
      result1.push(`this[${stringify(attr)}]=a${i};`);
    } 
    return result1;
  })());

  const prototypeName = nextPrototypeName();
  return _prototypeCache[cacheKey] = (new Function(`function ${prototypeName}(${params.join(',')}){${inits.join('')}} return ${prototypeName};`))();
};

const createRecordConstructor = variables => createCompiledPrototype((Array.from(variables).map((variable) => variable.label)));

const createTable = function(opts) {
  let { label, description, variables, rows, meta } = opts;
  if (!description) { description = 'No description available.'; }

  const schema = {};
  for (let variable of Array.from(variables)) { schema[variable.label] = variable; }

  const fill = function(i, go) {
    _fill(i, function(error, result) {
      if (error) {
        return go(error);
      } else {
        const { index: startIndex, values } = result;
        for (let index = 0; index < values.length; index++) {
          const value = values[index];
          rows[ startIndex + index ] = values[ index ];
        }
        return go(null);
      }
    });
  };
  
  const expand = (...types) => (() => {
    const result = [];
    for (let type of Array.from(types)) {
    //TODO attach to prototype
      label = uniqueId('__flow_variable_');
      result.push(schema[label] = createNumericVariable(label));
    }
    return result;
  })();

  return {
    label,
    description,
    schema,
    variables,
    rows,
    meta,
    fill,
    expand,
    _is_table_: true
  };
};

const includeZeroInRange = function(range) {
  const [ lo, hi ] = Array.from(range);
  if ((lo > 0) && (hi > 0)) {
    return [ 0, hi ];
  } else if ((lo < 0) && (hi < 0)) {
    return [ lo, 0 ];
  } else {
    return range;
  }
};

const combineRanges = function(...ranges) {
  let lo = Number.POSITIVE_INFINITY;
  let hi = Number.NEGATIVE_INFINITY;
  for (let range of Array.from(ranges)) {
    var value;
    if (lo > (value = range[0])) {
      lo = value;
    }
    if (hi < (value = range[1])) {
      hi = value;
    }
  }
  return [ lo, hi ];
};

const computeRange = function(rows, attr) {
  if (rows.length) {
    let lo = Number.POSITIVE_INFINITY;
    let hi = Number.NEGATIVE_INFINITY;
    for (let row of Array.from(rows)) {
      const value = row[attr];
      if (value < lo) { lo = value; }
      if (value > hi) { hi = value; }
    }
    return [ lo , hi ];
  } else {
    return [ -1, 1 ];
  }
};

const permute = function(array, indices) {
  const permuted = new Array(array.length);
  for (let i = 0; i < indices.length; i++) {
    const index = indices[i];
    permuted[i] = array[index];
  }
  return permuted;
};

const createAbstractVariable = (_label, _type, _domain, _format, _read) => ({
  label: _label,
  type: _type,
  domain: _domain || [],
  format: _format || identity,
  read: _read
});

var createNumericVariable = function(_label, _domain, _format, _read) {
  const self = createAbstractVariable(_label, TNumber, _domain || [ Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY], _format, _read);
  if (!self.read) {
    self.read = function(datum) {
      if (datum < self.domain[0]) { self.domain[0] = datum; }
      if (datum > self.domain[1]) { self.domain[1] = datum; }
      return datum;
    };
  }
  return self;
};

const createVariable = function(_label, _type, _domain, _format, _read) {
  if (_type === TNumber) {
    return createNumericVariable(_label, _domain, _format, _read);
  } else {
    return createAbstractVariable(_label, _type, _domain, _format, _read);
  }
};

const createFactor = function(_label, _domain, _format, _read) {
  let level;
  const self = createAbstractVariable(_label, TFactor, _domain || [], _format, _read);
  let _id = 0;
  const _levels = {};
  if (self.domain.length) {
    for (level of Array.from(self.domain)) {
      _levels[level] = _id++;
    }
  }

  if (!self.read) {
    self.read = function(datum) {
      let id;
      level = (datum === undefined) || (datum === null) ? 'null' : datum;
      if (undefined === (id = _levels[level])) {
        _levels[level] = (id = _id++);
        self.domain.push(level);
      }
      return id;
    };
  }

  return self;
};

const factor = function(array) {
  let _id = 0;
  const levels = {};
  const domain = [];
  const data = new Array(array.length);
  for (let i = 0; i < array.length; i++) {
    var id;
    const level = array[i];
    if (undefined === (id = levels[level])) {
      levels[level] = (id = _id++);
      domain.push(level);
    }
    data[i] = id;
  }
  return [ domain, data ];
};

module.exports = {
  Table: createTable,
  Variable: createVariable,
  Factor: createFactor,
  computeColumnInterpretation(type) {
    if (type === TNumber) {
      return 'c';
    } else if (type === TFactor) {
      return 'd';
    } else { 
      return 't';
    }
  },
  Record: createRecordConstructor,
  computeRange,
  combineRanges,
  includeZeroInRange,
  factor,
  permute
};
