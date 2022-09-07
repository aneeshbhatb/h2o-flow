/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
let outputDir, timeoutArg;
const puppeteer = require('puppeteer');

const printUsageAndExit = function(message) {
  console.log(`*** ${message} ***`);
  console.log(`Usage: node headless-test.js [--host ip:port] [--timeout seconds] [--packs foo:bar:baz] \
[--perf date buildId gitHash gitBranch ncpu os jobName outputDir] \
[--excludeFlows flow1;flow2]`
  );
  console.log('    ip:port      defaults to localhost:54321');
  console.log('    timeout      defaults to 3600');
  console.log('    packs        defaults to examples');
  console.log('    perf         performance of individual tests will be recorded in perf.csv in the output directory');
  return console.log('    excludeFlows do not run these flows');
};

const parseOpts = function(args) {
  console.log(`Using args ${args.join(' ')}`);
  let i = 0;
  const opts = {};
  while (i < args.length) {
    if (args[i] === "--host") {
      i = i + 1;
      if (i > args.length) { printUsageAndExit(`Unknown argument: ${args[i]}`); }
      opts['hostname'] = args[i];
    } else if (args[i] === "--timeout") {
      i = i + 1;
      if (i > args.length) { printUsageAndExit(`Unknown argument: ${args[i]}`); }
      opts['timeout'] = args[i];
    } else if (args[i] === "--packs") {
      i = i + 1;
      if (i > args.length) { printUsageAndExit(`Unknown argument: ${args[i]}`); }
      opts['packs'] = args[i];
    } else if (args[i] === "--perf") {
      opts['perf'] = true;
      i = i + 1;
      if (i > args.length) { printUsageAndExit(`Unknown argument: ${args[i]}`); }
      opts['date'] = args[i];
      i = i + 1;
      if (i > args.length) { printUsageAndExit(`Unknown argument: ${args[i]}`); }
      opts['buildId'] = args[i];
      i = i + 1;
      if (i > args.length) { printUsageAndExit(`Unknown argument: ${args[i]}`); }
      opts['gitHash'] = args[i];
      i = i + 1;
      if (i > args.length) { printUsageAndExit(`Unknown argument: ${args[i]}`); }
      opts['gitBranch'] = args[i];
      i = i + 1;
      if (i > args.length) { printUsageAndExit(`Unknown argument: ${args[i]}`); }
      opts['ncpu'] = args[i];
      i = i + 1;
      if (i > args.length) { printUsageAndExit(`Unknown argument: ${args[i]}`); }
      opts['os'] = args[i];
      i = i + 1;
      if (i > args.length) { printUsageAndExit(`Unknown argument: ${args[i]}`); }
      opts['jobName'] = args[i];
      i = i + 1;
      if (i > args.length) { printUsageAndExit(`Unknown argument: ${args[i]}`); }
      opts['outputDir'] = args[i];
    } else if (args[i] === "--excludeFlows") {
      i = i + 1;
      if (i > args.length) { printUsageAndExit(`Unknown argument: ${args[i]}`); }
      opts['excludeFlows'] = args[i];
    } else {
      printUsageAndExit(`Unknown argument: ${args[i]}`);
    }
    i = i + 1;
  }
  return opts;
};

const opts = parseOpts(process.argv.slice(2));

const hostname = opts['hostname'] != null ? opts['hostname'] : 'localhost:54321';
console.log(`TEST: Using ${hostname}`);

const timeout = (timeoutArg = opts['timeout']) ?
  1000 * parseInt(timeoutArg, 10)
:
  3600000;
console.log(`TEST: Using timeout ${timeout}ms`);

const packsArg = opts['packs'];
const packNames = packsArg ?
  packsArg.split(':')
:
  ['examples'];

const excludeFlowsArg = opts['excludeFlows'];
const excludeFlowsNames = excludeFlowsArg ?
  excludeFlowsArg.split(';')
:
  [];
for (let excludeFlowName of Array.from(excludeFlowsNames)) {
  console.log(`TEST: Excluding flow: ${excludeFlowName}`);
}

if (opts['perf']) {
  console.log(`TEST: Performance of individual tests will be recorded in perf.csv in output directory: \
${opts['outputDir']}.`
  );
  outputDir = opts['outputDir'];
}

const runner = function(packNames, date, buildId, gitHash, gitBranch, hostname, ncpu, os, jobName, perf, excludeFlowsNames) {
  window._date = date;
  window._buildId = buildId;
  window._gitHash = gitHash;
  window._gitBranch = gitBranch;
  window._hostname = hostname;
  window._ncpu = ncpu;
  window._os = os;
  window._jobName = jobName;
  window._perf = perf;
  window._excludeFlowsNames = excludeFlowsNames;
  console.log("getting context from window.flow", window.flow);
  const {
    context
  } = window.flow;
  const async = window.flow.async || window.Flow.Async;
  if (window._phantom_started_) {
    if (window._phantom_exit_) { return true; } else { return false; }
  } else {
    const runPacks = function(go) {
      window._phantom_test_summary_ = {};
      const tasks = packNames.map(packName => go => runPack(packName, go));
      return (async.iterate(tasks))(go);
    };

    var runPack = function(packName, go) {
      console.log(`Fetching pack: ${packName}...`);
      return context.requestPack(packName, function(error, flowNames) {
        if (error) {
          console.log(`*** ERROR *** Failed fetching pack ${packName}`);
          return go(new Error(`Failed fetching pack ${packName}`, error));
        } else {
          console.log('Processing pack...');
          const tasks = flowNames.map(flowName => go => runFlow(packName, flowName, go));
          return (async.iterate(tasks))(go);
        }
      });
    };

    var runFlow = function(packName, flowName, go) {
      const doFlow = function(flowName, excludeFlowsNames) {
        for (let f of Array.from(excludeFlowsNames)) {
          if (flowName === f) { return false; }
        }
        return true;
      };

      if (doFlow(flowName, window._excludeFlowsNames)) {
        const flowTitle = `${packName} - ${flowName}`;
        window._phantom_test_summary_[flowTitle] = 'FAILED';
        console.log(`Fetching flow document: ${packName} - ${flowName}...`);
        return context.requestFlow(packName, flowName, function(error, flow) {
          let waitForFlow;
          if (error) {
            console.log(`*** ERROR *** Failed fetching flow ${flowTitle}`);
            go(new Error(`Failed fetching flow ${flowTitle}`, error));
          } else {
            console.log(`Opening flow ${flowTitle}...`);

            window._phantom_running_ = true;

            // open flow
            context.open(flowTitle, flow);

            waitForFlow = function() {
              console.log(`Waiting for flow ${flowTitle}...`);
              if (window._phantom_running_) {
                console.log('ACK');
                return setTimeout(waitForFlow, 2000);
              } else {
                console.log('Flow completed!');
                const errors = window._phantom_errors_;
                // delete all keys from the k/v store
                return context.requestRemoveAll(() => go(errors ? errors : null));
              }
            };

            console.log('Running flow...');
            window._startTime = new Date().getTime() / 1000;
            context.executeAllCells(true, function(status, errors) {
              window._endTime = new Date().getTime() / 1000;
              console.log(`Flow finished with status: ${status}`);
              if (status === 'failed') {
                window._pass = 0;
                window._phantom_errors_ = errors;
              } else {
                window._pass = 1;
                window._phantom_test_summary_[flowTitle] = 'PASSED';
              }
              if (window._perf) {
                window._phantom_perf(`${window._date}, ${window._buildId}, ${window._gitHash}, \
${window._gitBranch}, ${window._hostname}, ${flowName}, \
${window._startTime}, ${window._endTime}, ${window._pass}, \
${window._ncpu}, ${window._os}, ${window._jobName}\n`
                );
              }
              return window._phantom_running_ = false;
            });
          }

          return setTimeout(waitForFlow, 2000);
        });
      } else {
        console.log(`Ignoring flow: ${flowName}`);
        return go(null);
      }
    };

    console.log('Starting tests...');
    window._phantom_errors_ = null;
    window._phantom_started_ = true;
    runPacks(function(error) {
      if (error) {
        console.log('*** ERROR *** Error running packs');
        window._phantom_errors_ = error.message != null ? error.message : error;
      } else {
        console.log('Finished running all packs!');
      }
      return window._phantom_exit_ = true;
    });
    return false;
  }
};

const waitFor = function(test, browser, onReady) {
  let interval;
  const startTime = new Date().getTime();
  let isComplete = false;
  const retest = function() {
    if (((new Date().getTime() - startTime) < timeout) && !isComplete) {
      console.log('TEST: PING');
      return isComplete = await(test());
    } else {
      clearInterval(interval);
      if (isComplete) {
        return onReady();
      } else {
        console.log('TEST: *** ERROR *** Timeout Exceeded');
        return await(browser.close());
      }
    }
  };

  return interval = setInterval(retest, 2000);
};

const main = function() {
  const args = {args: ['--no-sandbox']};
  if (process.env.CHROME_BIN) {
    args.executablePath = process.env.CHROME_BIN;
  }
  const browser = await(puppeteer.launch(args));
  const page = await(browser.newPage());

  page.on('requestfailed', function(request) {
    const errorText = request.failure() ?
      request.failure().errorText
    :
      "(no errorText)";
    return console.log(`BROWSER: *** REQUEST FAILED *** ${request.method()} ${request.url()}: ${errorText}`);
  });

  page.on('console', message => console.log(`BROWSER: ${message.text()}`));

  await(page.exposeFunction('_phantom_perf', function(perfLine) {
    const fs = require('fs');
    return fs.write(outputDir + '/perf.csv', perfLine, 'a');
  })
  );

  const response = await(page.goto(`http://${hostname}`));
  if (response.ok()) {
    const test = () => page.evaluate(runner, 
      packNames, opts['date'], opts['buildId'], opts['gitHash'], opts['gitBranch'], hostname, 
      opts['ncpu'], opts['os'], opts['jobName'], opts['perf'], excludeFlowsNames
    );

    var printErrors = function(errors, prefix) {
      if (prefix == null) { prefix = ''; }
      if (errors) {
        if (Array.isArray(errors)) {
          return (Array.from(errors).map((error) => printErrors(error, prefix + '  '))).join('\n');
        } else if (errors.message) {
          if (errors.cause) {
            return errors.message + '\n' + printErrors(errors.cause, prefix + '  ');
          } else {
            return errors.message;
          }
        } else {
          return errors;
        }
      } else {
        return errors;
      }
    };

    return waitFor(test, browser, function() {
      let exit_status;
      const errors = await(page.evaluate(() => window._phantom_errors_));
      if (errors) {
        console.log('------------------ FAILED -------------------');
        console.log(printErrors(errors));
        console.log('---------------------------------------------');
        exit_status = 1;
      } else {
        const summary = await(page.evaluate(() => window._phantom_test_summary_));
        console.log('------------------ PASSED -------------------');
        let testCount = 0;
        for (let flowTitle in summary) {
          const testStatus = summary[flowTitle];
          console.log(`${testStatus}: ${flowTitle}`);
          testCount++;
        }
        console.log(`(${testCount} tests executed.)`);
        console.log('---------------------------------------------');
        exit_status = 0;
      }
      await(browser.close());
      return process.exit(exit_status);
    });
  } else {
    const errorMessage = await(response.text());
    console.log(`TEST: *** ERROR *** Failed to load the page. Message: ${errorMessage}`);
    return await(browser.close());
  }
};

main();
