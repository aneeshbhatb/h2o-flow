/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
let { isRoutine, isFunction } = require('lodash');

const { signal, link } = require('../modules/dataflow');
const async = require('../modules/async');
const kernel = require('../modules/coffeescript-kernel');
const FlowError = require('../modules/flow-error');
const objectBrowser = require('./object-browser');

module.exports = function(_, guid, sandbox) {

  var print = function(arg) {
    if (arg !== print) {
      sandbox.results[guid].outputs(arg);
    }
    return print;
  };

  isRoutine = function(f) {
    for (let name in sandbox.routines) {
      const routine = sandbox.routines[name];
      if (f === routine) {
        return true;
      }
    }
    return false;
  };

  // XXX special-case functions so that bodies are not printed with the raw renderer.
  const render = function(input, output) {
    let cellResult;
    const outputBuffer = async.createBuffer([]);
    sandbox.results[guid] = (cellResult = {
      result: signal(null),
      outputs: outputBuffer
    });
    
    const evaluate = function(ft) {
      if ((ft != null ? ft.isFuture : undefined)) {
        return ft(function(error, result) {
          if (error) {
            output.error(new FlowError('Error evaluating cell', error));
            return output.end();
          } else {
            if (__guard__(result != null ? result._flow_ : undefined, x => x.render)) {
              return output.data(result._flow_.render(() => output.end()));
            } else {
              return output.data(objectBrowser(_, (() => output.end()), 'output', result));
            }
          }
        });
      } else {
        return output.data(objectBrowser(_, (() => output.end()), 'output', ft));
      }
    };

    outputBuffer.subscribe(evaluate);

    const tasks = [
      kernel.safetyWrapCoffeescript(guid),
      kernel.compileCoffeescript,
      kernel.parseJavascript,
      kernel.createRootScope(sandbox),
      kernel.removeHoistedDeclarations,
      kernel.rewriteJavascript(sandbox),
      kernel.generateJavascript,
      kernel.compileJavascript,
      kernel.executeJavascript(sandbox, print)
    ];
    return (async.pipe(tasks))(input, function(error) {
      if (error) { output.error(error); }

      const result = cellResult.result();
      if (isFunction(result)) {
        if (isRoutine(result)) {
          return print(result());
        } else {
          return evaluate(result);
        }
      } else {
        return output.close(objectBrowser(_, (() => output.end()), 'result', result));
      }
    });
  };

  render.isCode = true;
  return render;
};


function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}