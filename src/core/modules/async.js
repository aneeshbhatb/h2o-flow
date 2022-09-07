/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS201: Simplify complex destructure assignments
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { isString, isFunction, isArray, forEach } = require('lodash');

const { typeOf } = require('./prelude');
const FlowError = require('./flow-error');

const createBuffer = function(array) {
  const _array = array || [];
  let _go = null;
  const buffer = function(element) {
    if (element === undefined) {
      return _array;
    } else {
      _array.push(element);
      if (_go) { _go(element); }
      return element;
    }
  };
  buffer.subscribe = go => _go = go;
  buffer.buffer = _array;
  buffer.isBuffer = true;
  return buffer;
};

const _noop = go => go(null);

const _applicate = go => (function(error, args) {
  if (isFunction(go)) { return go.apply(null, [ error ].concat(args)); }
});

const _fork = function(f, args) {
  if (!isFunction(f)) { throw new FlowError("Not a function."); }
  var self = function(go) {
    const canGo = isFunction(go);
    if (self.settled) {
      // proceed with cached error/result
      if (self.rejected) {
        if (canGo) { return go(self.error); }
      } else {
        if (canGo) { return go(null, self.result); }
      }
    } else {
      return _join(args, function(error, args) {
        if (error) {
          self.error = error;
          self.fulfilled = false;
          self.rejected = true;
          if (canGo) { return go(error); }
        } else {
          return f.apply(null,
            args.concat(function(error, result) {
              if (error) {
                self.error = error;
                self.fulfilled = false;
                self.rejected = true;
                if (canGo) { go(error); }
              } else {
                self.result = result;
                self.fulfilled = true;
                self.rejected = false;
                if (canGo) { go(null, result); }
              }
              self.settled = true;
              return self.pending = false;
            })
          );
        }
      });
    }
  };

  self.method = f;
  self.args = args;
  self.fulfilled = false;
  self.rejected = false;
  self.settled = false;
  self.pending = true;

  self.isFuture = true;

  return self;
};

const _isFuture = function(a) { if ((a != null ? a.isFuture : undefined)) { return true; } else { return false; } };

var _join = function(args, go) {
  if (args.length === 0) { return go(null, []); }

  const _tasks = []; 
  const _results = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if ((arg != null ? arg.isFuture : undefined)) {
      _tasks.push({future: arg, resultIndex: i});
    } else {
      _results[i] = arg;
    }
  }

  if (_tasks.length === 0) { return go(null, _results); }

  let _actual = 0;
  let _settled = false;

  forEach(_tasks, task => task.future.call(null, function(error, result) {
    if (_settled) { return; }
    if (error) {
      _settled = true;
      go(new FlowError(`Error evaluating future[${task.resultIndex}]`, error));
    } else {
      _results[task.resultIndex] = result;
      _actual++;
      if (_actual === _tasks.length) {
        _settled = true;
        go(null, _results);
      }
    }
  }));
};

// Like _.compose, but async. 
// Equivalent to caolan/async.waterfall()
const pipe = function(tasks) {
  const _tasks = tasks.slice(0);

  var next = function(args, go) {
    const task = _tasks.shift();
    if (task) {
      return task.apply(null, args.concat(function(error, ...results) {
        if (error) {
          return go(error);
        } else {
          return next(results, go);
        }
      })
      );
    } else {
      return go.apply(null, [ null ].concat(args));
    }
  };

  return function(...args1) {
    const adjustedLength = Math.max(args1.length, 1), args = args1.slice(0, adjustedLength - 1), go = args1[adjustedLength - 1];
    return next(args, go);
  };
};

const iterate = function(tasks) {
  const _tasks = tasks.slice(0);
  const _results = [];
  var next = function(go) {
    const task = _tasks.shift();
    if (task) {
      return task(function(error, result) {
        if (error) {
          return go(error);
        } else {
          _results.push(result);
        }
        return next(go);
      });
    } else {
      //XXX should errors be included in arg #1?
      return go(null, _results);
    }
  };

  return go => next(go);
};

//
// Gives a synchronous operation an asynchronous signature.
// Used to pass synchronous functions to callers that expect
//   asynchronous signatures.
const _async = function(f, ...args) {
  const later = function(...args1) {
    let adjustedLength, go;
    let args;
    adjustedLength = Math.max(args1.length, 1),
      args = args1.slice(0, adjustedLength - 1),
      go = args1[adjustedLength - 1];
    try {
      const result = f.apply(null, args);
      return go(null, result);
    } catch (error) {
      return go(error);
    }
  };
  return _fork(later, args);
};

//
// Asynchronous find operation.
//
// find attr, prop, array
// find array, attr, prop
// find attr, obj
// find obj, attr
//

var _find$3 = function(attr, prop, obj) {
  if (_isFuture(obj)) {
    return _async(_find$3, attr, prop, obj);
  } else if (isArray(obj)) {
    for (let v of Array.from(obj)) {
      if (v[attr] === prop) { return v; }
    }
    return;
  }
};

var _find$2 = function(attr, obj) {
  if (_isFuture(obj)) {
    return _async(_find$2, attr, obj);
  } else if (isString(attr)) {
    if (isArray(obj)) {
      return _find$3('name', attr, obj);
    } else {
      return obj[attr];
    }
  }
};

const _find = function(...args) {
  switch (args.length) {
    case 3:
      var [ a, b, c ] = Array.from(args);
      var ta = typeOf(a);
      var tb = typeOf(b);
      var tc = typeOf(c);
      if ((ta === 'Array') && (tb === 'String')) {
        return _find$3(b, c, a);
      } else if ((ta === 'String') && (tc = 'Array')) {
        return _find$3(a, b, c);
      }
      break;
    case 2:
      [ a, b ] = Array.from(args);
      if (!a) { return; }
      if (!b) { return; }
      if (isString(b)) {
        return _find$2(b, a);
      } else if (isString(a)) {
        return _find$2(a, b);
      }
      break;
  }
};

// Duplicate of _find$2
var _get = function(attr, obj) {
  if (_isFuture(obj)) {
    return _async(_get, attr, obj);
  } else if (isString(attr)) {
    if (isArray(obj)) {
      return _find$3('name', attr, obj);
    } else {
      return obj[attr];
    }
  }
};

module.exports = {
  createBuffer, //XXX rename
  noop: _noop,
  applicate: _applicate,
  isFuture: _isFuture,
  fork: _fork,
  join: _join,
  pipe,
  iterate,
  async: _async,
  find: _find,
  get: _get
};


