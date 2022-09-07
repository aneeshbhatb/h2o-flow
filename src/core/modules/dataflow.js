/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS201: Simplify complex destructure assignments
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
//
// Reactive programming / Dataflow programming wrapper over KO
//
let createObservable, createObservableArray, isObservable;
const { map, forEach, isFunction, isArray } = require('lodash');

const { copy, never, remove } = require('./prelude');

const createSlot = function() {
  let arrow = null;

  const self = function(...args) {
    if (arrow) {
      return arrow.func.apply(null, args);
    } else {
      return undefined;
    }
  };

  self.subscribe = function(func) {
    console.assert(isFunction(func));
    if (arrow) {
      throw new Error('Cannot re-attach slot');
    } else {
      return arrow = {
        func,
        dispose() { return arrow = null; }
      };
    }
  };

  self.dispose = function() {
    if (arrow) { return arrow.dispose(); }
  };

  return self;
};

const createSlots = function() {
  const arrows = [];

  const self = (...args) => map(arrows, arrow => arrow.func.apply(null, args));

  self.subscribe = function(func) {
    let arrow;
    console.assert(isFunction(func));
    arrows.push(arrow = {
      func,
      dispose() { return remove(arrows, arrow); }
    }
    );
    return arrow;
  };

  self.dispose = () => forEach((copy(arrows)), arrow => arrow.dispose());

  return self;
};

if (typeof window !== 'undefined' && window !== null) {
  const ko = require('./knockout');
  createObservable = ko.observable;
  createObservableArray = ko.observableArray;
  ({
    isObservable
  } = ko);
} else {
  createObservable = function(initialValue) {
    const arrows = [];
    let currentValue = initialValue;

    const notifySubscribers = function(arrows, newValue) {
      for (let arrow of Array.from(arrows)) {
        arrow.func(newValue);
      }
    };

    var self = function(newValue) {
      if (arguments.length === 0) {
        return currentValue;
      } else {
        const unchanged = self.equalityComparer ?
          self.equalityComparer(currentValue, newValue)
        :
          currentValue === newValue;

        if (!unchanged) {
          currentValue = newValue;
          return notifySubscribers(arrows, newValue);
        }
      }
    };

    self.subscribe = function(func) {
      let arrow;
      console.assert(isFunction(func));
      arrows.push(arrow = {
        func,
        dispose() { return remove(arrows, arrow); }
      }
      );
      return arrow;
    };

    self.__observable__ = true;

    return self;
  };

  createObservableArray = createObservable;

  isObservable = function(obj) { if (obj.__observable__) { return true; } else { return false; } };
}

var createSignal = function(value, equalityComparer) {
  if (arguments.length === 0) {
    return createSignal(undefined, never);
  } else {
    const observable = createObservable(value);
    if (isFunction(equalityComparer)) { observable.equalityComparer = equalityComparer; }
    return observable;
  }
};

const _isSignal = isObservable;

const createSignals = array => createObservableArray(array || []);

const _link = function(source, func) {
  console.assert(isFunction(source, '[signal] is not a function'));
  console.assert(isFunction(source.subscribe, '[signal] does not have a [dispose] method'));
  console.assert(isFunction(func, '[func] is not a function'));

  return source.subscribe(func);
};

const _unlink = function(arrows) {
  if (isArray(arrows)) {
    return (() => {
      const result = [];
      for (let arrow of Array.from(arrows)) {
        console.assert(isFunction(arrow.dispose, '[arrow] does not have a [dispose] method'));
        result.push(arrow.dispose());
      }
      return result;
    })();
  } else {
    console.assert(isFunction(arrows.dispose, '[arrow] does not have a [dispose] method'));
    return arrows.dispose();
  }
};

//
// Combinators
//

const _apply = (sources, func) => func.apply(null, map(sources, source => source()));

const _act = function(...args) {
  const adjustedLength = Math.max(args.length, 1), sources = args.slice(0, adjustedLength - 1), func = args[adjustedLength - 1];
  _apply(sources, func);
  return map(sources, source => _link(source, () => _apply(sources, func)));
};

const _react = function(...args) {
  const adjustedLength = Math.max(args.length, 1), sources = args.slice(0, adjustedLength - 1), func = args[adjustedLength - 1];
  return map(sources, source => _link(source, () => _apply(sources, func)));
};

const _lift = function(...args) {
  const adjustedLength = Math.max(args.length, 1), sources = args.slice(0, adjustedLength - 1), func = args[adjustedLength - 1];
  const evaluate = () => _apply(sources, func);
  const target = createSignal(evaluate());
  map(sources, source => _link(source, () => target(evaluate())));
  return target;
};

const _merge = function(...args) {
  const adjustedLength = Math.max(args.length, 2), sources = args.slice(0, adjustedLength - 2), target = args[adjustedLength - 2], func = args[adjustedLength - 1];
  const evaluate = () => _apply(sources, func);
  target(evaluate());
  return map(sources, source => _link(source, () => target(evaluate())));
};

module.exports = {
  slot: createSlot,
  slots: createSlots,
  signal: createSignal,
  signals: createSignals,
  isSignal: _isSignal,
  link: _link,
  unlink: _unlink,
  act: _act,
  react: _react,
  lift: _lift,
  merge: _merge
};
