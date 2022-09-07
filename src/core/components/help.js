/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const marked = require('../modules/marked');
const { map, filter, head, escape, sortBy } = require('lodash');

const { lift, link, signal, signals } = require("../modules/dataflow");
const html = require('../modules/html');
const util = require('../../ext/modules/util');

let _catalog = null;
const _index = {};
let _homeContent = null;

const _homeMarkdown = `\
<blockquote>
Using Flow for the first time?
<br/>
<div style='margin-top:10px'>
  <button type='button' data-action='get-flow' data-pack-name='examples' data-flow-name='QuickStartVideos.flow' class='flow-button'><i class='fa fa-file-movie-o'></i><span>Quickstart Videos</span>
  </button>
</div>
</blockquote>

Or, <a href='#' data-action='get-pack' data-pack-name='examples'>view example Flows</a> to explore and learn H<sub>2</sub>O.

###### Star H2O on Github!

<span class="github-btn">
    <a class="gh-btn" href="https://github.com/h2oai/h2o-3/" target="_blank">
      <span class="gh-ico"></span><span class="gh-text">Star</span>
    </a>
</span>
<br/>

###### General

%HELP_TOPICS%

###### Examples

Flow packs are a great way to explore and learn H<sub>2</sub>O. Try out these Flows and run them in your browser.<br/><a href='#' data-action='get-packs'>Browse installed packs...</a>

###### H<sub>2</sub>O REST API

- <a href='#' data-action='endpoints'>Routes</a>
- <a href='#' data-action='schemas'>Schemas</a>
\
`;

exports.init = function(_) {
  const _content = signal(null);
  const _history = []; // [DOMElement]
  let _historyIndex = -1;
  const _canGoBack = signal(false);
  const _canGoForward = signal(false);

  const goTo = function(index) {
    const content = _history[(_historyIndex = index)];

    $('a, button', $(content))
      .each(function(i) {
        let action;
        const $a = $(this);
        if (action = $a.attr('data-action')) {
          return $a.click(() => performAction(action, $a));
        }
    });

    _content(content);
    _canGoForward(_historyIndex < (_history.length - 1));
    _canGoBack(_historyIndex > 0);
  };

  const goBack = function() {
    if (_historyIndex > 0) { return goTo(_historyIndex - 1); }
  };

  const goForward = function() {
    if (_historyIndex < (_history.length - 1)) { return goTo(_historyIndex + 1); }
  };

  const displayHtml = function(content) {
    if (_historyIndex < (_history.length - 1)) {
      _history.splice(_historyIndex + 1, _history.length - (_historyIndex + 1), content);
    } else {
      _history.push(content);
    }
    return goTo(_history.length - 1);
  };

  const fixImageSources = html => html.replace(/\s+src\s*\=\s*\"images\//g, ' src="help/images/');

  var performAction = function(action, $el) {
    switch (action) {
      case 'help':
        var topic = _index[$el.attr('data-topic')];
        _.requestHelpContent(topic.name, function(error, content) {
          const [ div, mark, h5, h6 ] = Array.from(html.template('div', 'mark', 'h5', 'h6'));
          const contents = [
            mark('Help'),
            h5(topic.title),
            fixImageSources(div(content))
          ];

          // render a TOC if this topic has children
          if (topic.children.length) {
            contents.push(h6('Topics'));
            contents.push(buildToc(topic.children)); 
          }

          return displayHtml(html.render('div', div(contents)));
        });
        break;

      case 'assist':
        _.insertAndExecuteCell('cs', 'assist');
        break;

      case 'get-packs':
        _.requestPacks(function(error, packNames) {
          if (!error) {
            return displayPacks(filter(packNames, packName => packName !== 'test'));
          }
        });
        break;

      case 'get-pack':
        var packName = $el.attr('data-pack-name');
        _.requestPack(packName, function(error, flowNames) {
          if (!error) {
            return displayFlows(packName, flowNames);
          }
        });
        break;

      case 'get-flow':
        _.confirm('This action will replace your active notebook.\nAre you sure you want to continue?', { acceptCaption: 'Load Notebook', declineCaption: 'Cancel' }, function(accept) {
          if (accept) {
            packName = $el.attr('data-pack-name');
            const flowName = $el.attr('data-flow-name');
            if (util.validateFileExtension(flowName, '.flow')) {
              return _.requestFlow(packName, flowName, function(error, flow) {
                if (!error) {
                  return _.open((util.getFileBaseName(flowName, '.flow')), flow);
                }
              });
            }
          }
        });
        break;

      case 'endpoints':
        _.requestEndpoints(function(error, response) {
          if (!error) {
            return displayEndpoints(response.routes);
          }
        });
        break;

      case 'endpoint':
        var routeIndex = $el.attr('data-index');
        _.requestEndpoint(routeIndex, function(error, response) {
          if (!error) {
            return displayEndpoint(head(response.routes));
          }
        });
        break;

      case 'schemas':
        _.requestSchemas(function(error, response) {
          if (!error) {
            return displaySchemas(sortBy(response.schemas, schema => schema.name));
          }
        });
        break;

      case 'schema':
        var schemaName = $el.attr('data-schema');
        _.requestSchema(schemaName, function(error, response) {
          if (!error) {
            return displaySchema(head(response.schemas));
          }
        });
        break;
    }

  };

  var buildToc = function(nodes) {
    const [ ul, li, a ] = Array.from(html.template('ul', 'li', "a href='#' data-action='help' data-topic='$1'"));
    return ul(map(nodes, node => li(a(node.title, node.name))));
  };

  var buildTopics = function(index, topics) {
    for (let topic of Array.from(topics)) {
      index[topic.name] = topic;
      if (topic.children.length) {
        buildTopics(index, topic.children);
      }
    }
  };

  var displayPacks = function(packNames) {
    const [ div, mark, h5, p, i, a ] = Array.from(html.template('div', 'mark', 'h5', 'p', 'i.fa.fa-folder-o', "a href='#' data-action='get-pack' data-pack-name='$1'"));

    displayHtml(html.render('div', div([
      mark('Packs'),
      h5('Installed Packs'),
      div(map(packNames, packName => p([ i(), a(packName, packName) ])))
    ])));
  };

  var displayFlows = function(packName, flowNames) {
    const [ div, mark, h5, p, i, a ] = Array.from(html.template('div', 'mark', 'h5', 'p', 'i.fa.fa-file-text-o', `a href='#' data-action='get-flow' data-pack-name='${packName}' data-flow-name='$1'`));

    displayHtml(html.render('div', div([
      mark('Pack'),
      h5(packName), 
      div(map(flowNames, flowName => p([ i(), a(flowName, flowName) ])))
    ])));
  };

  
  var displayEndpoints = function(routes) {
    const [ div, mark, h5, p, action, code ] = Array.from(html.template('div', 'mark', 'h5', 'p', "a href='#' data-action='endpoint' data-index='$1'", 'code'));
    const els = [
      mark('API'),
      h5('List of Routes')
    ];
    for (let routeIndex = 0; routeIndex < routes.length; routeIndex++) {
      const route = routes[routeIndex];
      els.push(p((action((code(route.http_method + " " + route.url_pattern)), routeIndex)) + "<br/>" + route.summary));
    }

    displayHtml(html.render('div', div(els)));
  };

  const goHome = () => displayHtml(html.render('div', _homeContent));

  var displayEndpoint = function(route) {
    const [ div, mark, h5, h6, p, action, code ] = Array.from(html.template('div', 'mark', 'h5', 'h6', 'p', "a href='#' data-action='schema' data-schema='$1'", 'code'));

    return displayHtml(html.render('div', div([
      mark('Route'),

      h5(route.url_pattern),

      h6('Method'),
      p(code(route.http_method)),

      h6('Summary'),
      p(route.summary),

      h6('Parameters'),
      p((route.path_params != null ? route.path_params.length : undefined) ? route.path_params.join(', ') : '-'),

      h6('Input Schema'),
      p(action((code(route.input_schema)), route.input_schema)),

      h6('Output Schema'),
      p(action((code(route.output_schema)), route.output_schema))
    ])));
  };

  var displaySchemas = function(schemas) {

    const [ div, h5, ul, li, variable, mark, code, action ] = Array.from(html.template('div', 'h5', 'ul', 'li', 'var', 'mark', 'code', "a href='#' data-action='schema' data-schema='$1'"));

    const els = [
      mark('API'),
      h5('List of Schemas'),
      ul((Array.from(schemas).map((schema) => li(`${action((code(schema.name)), schema.name)} ${variable(escape(schema.type))}`))))
    ];

    return displayHtml(html.render('div', div(els)));
  };

  var displaySchema = function(schema) {
    const [ div, mark, h5, h6, p, code, variable, small ] = Array.from(html.template('div', 'mark', 'h5', 'h6', 'p', 'code', 'var', 'small'));

    const content = [
      mark('Schema'),
      h5(`${schema.name} (${escape(schema.type)})`),
      h6('Fields')
    ];
    
    for (let field of Array.from(schema.fields)) {
      if (field.name !== '__meta') {
        content.push(p(`${variable(field.name)}${field.required ? '*' : ''} ${code(escape(field.type))}<br/>${small(field.help)}`));
      }
    }

    return displayHtml(html.render('div', div(content)));
  };

  const initialize = function(catalog) {
    _catalog = catalog;
    buildTopics(_index, _catalog);
    _homeContent = (marked(_homeMarkdown)).replace('%HELP_TOPICS%', buildToc(_catalog)); 
    return goHome();
  };

  link(_.ready, () => _.requestHelpIndex(function(error, catalog) {
    if (!error) { return initialize(catalog); }
  }));

  return {
    content: _content,
    goHome,
    goBack,
    canGoBack: _canGoBack,
    goForward,
    canGoForward: _canGoForward
  };
};

