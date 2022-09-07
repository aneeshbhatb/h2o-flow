/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const test = require('tape');
const { isUndefined } = require('lodash');

const { act, react, merge, slot, slots, link, unlink, signal, lift } = require('./dataflow');

test('dataflow slot should not fail when unlinked', function(t) {
  const func = slot();
  let result = null;
  t.doesNotThrow(() => result = func(1, 2, 3));
  t.ok(isUndefined(result));
  return t.end();
});

test('dataflow slot should propagate when linked', function(t) {
  const func = slot();
  link(func, (a, b, c) => a + b + c);
  t.equal(func(1, 2, 3), 6);
  return t.end();
});

test('dataflow slot should raise exception when re-linked', function(t) {
  const func = slot();
  link(func, (a, b, c) => a + b + c);
  t.equal(func(1, 2, 3), 6);
  t.throws(() => link(func, (a, b, c) => a * b * c));
  return t.end();
});

test('dataflow slot should stop propagating when unlinked', function(t) {
  const func = slot();
  const target = (a, b, c) => a + b + c;
  const arrow = link(func, target);
  t.equal(func(1, 2, 3), 6);
  unlink(arrow);
  let result = null;
  t.doesNotThrow(() => result = func(1, 2, 3));
  t.ok(isUndefined(result));
  return t.end();
});

test('dataflow slot should stop propagating when disposed', function(t) {
  const func = slot();
  const target = (a, b, c) => a + b + c;
  link(func, target);
  t.equal(func(1, 2, 3), 6);
  func.dispose();
  let result = null;
  t.doesNotThrow(() => result = func(1, 2, 3));
  t.ok(isUndefined(result));
  return t.end();
});

test('dataflow slots should not fail when unlinked', function(t) {
  const func = slots();
  let result = null;
  t.doesNotThrow(() => result = func(1, 2, 3));
  t.deepEqual(result, []);
  return t.end();
});

test('dataflow slots should propagate when linked', function(t) {
  const func = slots();
  link(func, (a, b, c) => a + b + c);
  t.deepEqual(func(1, 2, 3), [6]);
  return t.end();
});

test('dataflow slots should allow multicasting', function(t) {
  const func = slots();
  const addition = (a, b, c) => a + b + c;
  const multiplication = (a, b, c) => a * b * c;
  link(func, addition);
  link(func, multiplication);
  t.deepEqual(func(2, 3, 4), [9, 24]);
  return t.end();
});

test('dataflow slots should stop propagating when unlinked', function(t) {
  const func = slots();
  const addition = (a, b, c) => a + b + c;
  const multiplication = (a, b, c) => a * b * c;
  const additionArrow = link(func, addition);
  const multiplicationArrow = link(func, multiplication);
  t.deepEqual(func(2, 3, 4), [9, 24]);
  unlink(additionArrow);
  t.deepEqual(func(2, 3, 4), [24]);
  unlink(multiplicationArrow);
  t.deepEqual(func(2, 3, 4), []);
  return t.end();
});

test('dataflow slots should stop propagating when disposed', function(t) {
  const func = slots();
  const addition = (a, b, c) => a + b + c;
  const multiplication = (a, b, c) => a * b * c;
  const additionArrow = link(func, addition);
  const multiplicationArrow = link(func, multiplication);
  t.deepEqual(func(2, 3, 4), [9, 24]);
  func.dispose();
  t.deepEqual(func(2, 3, 4), []);
  return t.end();
});

test('dataflow signal should hold value when initialized', function(t) {
  const sig = signal(42);
  t.equal(sig(), 42);
  return t.end();
});

test('dataflow signal should return value when called without arguments', function(t) {
  const sig = signal(42);
  t.equal(sig(), 42);
  return t.end();
});

test('dataflow signal should hold new value when reassigned', function(t) {
  const sig = signal(42);
  t.equal(sig(), 42);
  sig(43);
  t.equal(sig(), 43);
  return t.end();
});

test('dataflow signal should not propagate unless value is changed (without comparator)', function(t) {
  const sig = signal(42);
  let propagated = false;
  link(sig, value => propagated = true);
  t.equal(propagated, false);
  sig(42);
  t.equal(propagated, false);
  return t.end();
});

test('dataflow signal should propagate value when value is changed (without comparator)', function(t) {
  const sig = signal(42);
  let propagated = false;
  let propagatedValue = 0;
  link(sig, function(value) {
    propagated = true;
    return propagatedValue = value;
  });
  t.equal(propagated, false);
  sig(43);
  t.equal(propagated, true);
  t.equal(propagatedValue, 43);
  return t.end();
});

test('dataflow signal should not propagate unless value is changed (with comparator)', function(t) {
  const comparator = (a, b) => a.answer === b.answer;
  const sig = signal({ answer: 42 }, comparator);
  let propagated = false;
  link(sig, value => propagated = true);
  t.equal(propagated, false);
  sig({answer: 42});
  t.equal(propagated, false);
  return t.end();
});

test('dataflow signal should propagate when value is changed (with comparator)', function(t) {
  const comparator = (a, b) => a.answer === b.answer;
  const sig = signal({ answer: 42 }, comparator);
  let propagated = false;
  let propagatedValue = null;
  link(sig, function(value) {
    propagated = true;
    return propagatedValue = value;
  });
  t.equal(propagated, false);

  const newValue = {answer: 43};
  sig(newValue);
  t.equal(propagated, true);
  t.equal(propagatedValue, newValue);
  return t.end();
});

test('dataflow signal should allow multicasting', function(t) {
  const sig = signal(42);
  let propagated1 = false;
  let propagated2 = false;
  const target1 = value => propagated1 = true;
  const target2 = value => propagated2 = true;
  link(sig, target1);
  link(sig, target2);
  t.equal(propagated1, false);
  t.equal(propagated2, false);

  sig(43);
  t.equal(propagated1, true);
  t.equal(propagated2, true);
  return t.end();
});

test('dataflow signal should stop propagating when unlinked', function(t) {
  const sig = signal(42);
  let propagated1 = false;
  let propagated2 = false;
  const target1 = value => propagated1 = true;
  const target2 = value => propagated2 = true;
  const arrow1 = link(sig, target1);
  const arrow2 = link(sig, target2);
  t.equal(propagated1, false);
  t.equal(propagated2, false);

  sig(43);
  t.equal(propagated1, true);
  t.equal(propagated2, true);

  propagated1 = false;
  propagated2 = false;
  unlink(arrow2);
  sig(44);
  t.equal(propagated1, true);
  t.equal(propagated2, false);

  propagated1 = false;
  propagated2 = false;
  unlink(arrow1);
  sig(45);
  t.equal(propagated1, false);
  t.equal(propagated2, false);
  return t.end();
});

test('dataflow empty signals should always propagate', function(t) {
  const event = signal();
  let propagated = false;
  link(event, () => propagated = true);
  t.equal(propagated, false);
  event(true);
  t.equal(propagated, true);
  return t.end();
});

test('dataflow context should unlink multiple arrows at once', function(t) {
  const sig = signal(42);
  let propagated1 = false;
  let propagated2 = false;
  const target1 = () => propagated1 = true;
  const target2 = () => propagated2 = true;
  const arrow1 = link(sig, target1);
  const arrow2 = link(sig, target2);
  t.equal(propagated1, false);
  t.equal(propagated2, false);

  sig(43);
  t.equal(propagated1, true);
  t.equal(propagated2, true);

  propagated1 = false;
  propagated2 = false;
  unlink([ arrow1, arrow2 ]);
  sig(44);
  t.equal(propagated1, false);
  t.equal(propagated2, false);
  return t.end();
});

test('dataflow act', function(t) {
  const width = signal(2);
  const height = signal(6);
  let area = 0;
  const arrow = act(width, height, (w, h) => area = w * h);
  t.equal(area, 12);

  width(7);
  t.equal(area, 42);

  unlink(arrow);
  width(2);
  t.equal(area, 42);
  return t.end();
});

test('dataflow merge', function(t) {
  const width = signal(2);
  const height = signal(6);
  const area = signal(0);
  const arrow = merge(width, height, area, (w, h) => w * h);
  t.equal(area(), 12);

  width(7);
  t.equal(area(), 42);

  unlink(arrow);
  width(2);
  t.equal(area(), 42);
  return t.end();
});

test('dataflow lift', function(t) {
  const width = signal(2);
  const height = signal(6);
  const area = lift(width, height, (w, h) => w * h);
  t.equal(area(), 12);

  width(7);
  t.equal(area(), 42);
  return t.end();
});


