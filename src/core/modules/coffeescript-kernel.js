/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { map, isArray, keyBy, values } = require("lodash");
const { isObject } = require('./prelude');

const esprima = require('esprima');
const escodegen = require('escodegen');
const CoffeeScript = require('coffeescript');

const FlowError = require('./flow-error');

module.exports = (function() {
  const safetyWrapCoffeescript = guid => (function(cs, go) {
    const lines = cs
      // normalize CR/LF
      .replace(/[\n\r]/g, '\n')
      // split into lines
      .split('\n');

    // indent once
    const block = map(lines, line => '  ' + line);

    // enclose in execute-immediate closure
    block.unshift(`_h2o_results_['${guid}'].result do ->`);

    // join and proceed
    return go(null, block.join('\n'));
  });

  const compileCoffeescript = function(cs, go) {
    try {
      return go(null, CoffeeScript.compile(cs, {bare: true}));
    } catch (error) {
      return go(new FlowError('Error compiling coffee-script', error));
    }
  };

  const parseJavascript = function(js, go) {
    try {
      return go(null, esprima.parse(js));
    } catch (error) {
      return go(new FlowError('Error parsing javascript expression', error));
    }
  };


  var identifyDeclarations = function(node) {
    if (!node) { return null; }

    switch (node.type) {
      case 'VariableDeclaration':
        return (Array.from(node.declarations).filter((declaration) => (declaration.type === 'VariableDeclarator') && (declaration.id.type === 'Identifier')).map((declaration) => ({name: declaration.id.name, object:'_h2o_context_'})));
        break;
          
      case 'FunctionDeclaration':
        //
        // XXX Not sure about the semantics here.
        //
        if (node.id.type === 'Identifier') {
          return [ {name: node.id.name, object: '_h2o_context_'} ];
        }
        break;
      case 'ForStatement':
        return identifyDeclarations(node.init);
        break;
      case 'ForInStatement': case 'ForOfStatement':
        return identifyDeclarations(node.left);
        break;
    }
    return null;
  };

  const parseDeclarations = function(block) {
    const identifiers = [];
    for (let node of Array.from(block.body)) {
      var declarations;
      if (declarations = identifyDeclarations(node)) {
        for (let declaration of Array.from(declarations)) {
          identifiers.push(declaration);
        }
      }
    }
    return keyBy(identifiers, identifier => identifier.name);
  };

  var traverseJavascript = function(parent, key, node, f) {
    let child, i;
    if (isArray(node)) {
      i = node.length;
      // walk backwards to allow callers to delete nodes
      while (i--) {
        child = node[i];
        if (isObject(child)) {
          traverseJavascript(node, i, child, f);
          f(node, i, child);
        }
      }
    } else { 
      for (i in node) {
        child = node[i];
        if (isObject(child)) {
          traverseJavascript(node, i, child, f);
          f(node, i, child);
        }
      }
    }
  };

  const deleteAstNode = function(parent, i) {
    if (isArray(parent)) {
      return parent.splice(i, 1);
    } else if (isObject(parent)) {
      return delete parent[i];
    }
  };

  const createLocalScope = function(node) {
    // parse all declarations in this scope
    const localScope = parseDeclarations(node.body);

    // include formal parameters
    for (let param of Array.from(node.params)) {
      if (param.type === 'Identifier') {
        localScope[param.name] = {name: param.name, object: 'local'};
      }
    }

    return localScope;
  };

  // redefine scope by coalescing down to non-local identifiers
  const coalesceScopes = function(scopes) {
    const currentScope = {};
    for (let i = 0; i < scopes.length; i++) {
      var identifier, name;
      const scope = scopes[i];
      if (i === 0) {
        for (name in scope) {
          identifier = scope[name];
          currentScope[name] = identifier;
        }
      } else {
        for (name in scope) {
          identifier = scope[name];
          currentScope[name] = null;
        }
      }
    }
    return currentScope;
  };

  var traverseJavascriptScoped = function(scopes, parentScope, parent, key, node, f) {
    let currentScope;
    const isNewScope = (node.type === 'FunctionExpression') || (node.type === 'FunctionDeclaration');
    if (isNewScope) {
      // create and push a new local scope onto scope stack
      scopes.push(createLocalScope(node));
      currentScope = coalesceScopes(scopes);
    } else {
      currentScope = parentScope;
    }

    for (key in node) {
      const child = node[key];
      if (isObject(child)) {
        traverseJavascriptScoped(scopes, currentScope, node, key, child, f);
        f(currentScope, node, key, child); 
      }
    }

    if (isNewScope) {
      // discard local scope
      scopes.pop();
    }

  };

  const createRootScope = sandbox => (function(program, go) {
    try {
      const rootScope = parseDeclarations(program.body[0].expression.arguments[0].callee.body);

      for (let name in sandbox.context) {
        rootScope[name] = {
          name,
          object: '_h2o_context_'
        };
      }
      return go(null, rootScope, program);

    } catch (error) {
      return go(new FlowError('Error parsing root scope', error));
    }
  });

  //TODO DO NOT call this for raw javascript:
  // Require alternate strategy: 
  //   Declarations with 'var' need to be local to the cell.
  //   Undeclared identifiers are assumed to be global.
  //   'use strict' should be unsupported.
  const removeHoistedDeclarations = function(rootScope, program, go) {
    try {
      traverseJavascript(null, null, program, function(parent, key, node) {
        if (node.type === 'VariableDeclaration') {		
          const declarations = node.declarations.filter(declaration => (declaration.type === 'VariableDeclarator') && (declaration.id.type === 'Identifier') && !rootScope[declaration.id.name]);		
          if (declarations.length === 0) {
            // purge this node so that escodegen doesn't fail		
            return deleteAstNode(parent, key);		
          } else {		
            // replace with cleaned-up declarations
            return node.declarations = declarations;
          }
        }
      });
      return go(null, rootScope, program);
    } catch (error) {
      return go(new FlowError('Error rewriting javascript', error));
    }
  };


  const createGlobalScope = function(rootScope, routines) {
    let name;
    const globalScope = {};

    for (name in rootScope) {
      const identifier = rootScope[name];
      globalScope[name] = identifier;
    }

    for (name in routines) {
      globalScope[name] = {name, object: 'h2o'};
    }

    return globalScope;
  };

  const rewriteJavascript = sandbox => (function(rootScope, program, go) {
    const globalScope = createGlobalScope(rootScope, sandbox.routines); 

    try {
      traverseJavascriptScoped([ globalScope ], globalScope, null, null, program, function(globalScope, parent, key, node) {
        if (node.type === 'Identifier') {
          let identifier;
          if ((parent.type === 'VariableDeclarator') && (key === 'id')) { return; } // ignore var declarations
          if (key === 'property') { return; } // ignore members
          if (!(identifier = globalScope[node.name])) { return; }

          // qualify identifier with '_h2o_context_'
          return parent[key] = {
            type: 'MemberExpression',
            computed: false,
            object: {
              type: 'Identifier',
              name: identifier.object
            },
            property: {
              type: 'Identifier',
              name: identifier.name
            }
          };
        }
      });
      return go(null, program);
    } catch (error) {
      return go(new FlowError('Error rewriting javascript', error));
    }
  });


  const generateJavascript = function(program, go) {
    try {
      return go(null, escodegen.generate(program));
    } catch (error) {
      return go(new FlowError('Error generating javascript', error));
    }
  };

  const compileJavascript = function(js, go) {
    try {
      const closure = new Function('h2o', '_h2o_context_', '_h2o_results_', 'print', js);
      return go(null, closure);
    } catch (error) {
      return go(new FlowError('Error compiling javascript', error));
    }
  };

  const executeJavascript = (sandbox, print) => (function(closure, go) {
    try {
      return go(null, closure(sandbox.routines, sandbox.context, sandbox.results, print));
    } catch (error) {
      return go(new FlowError('Error executing javascript', error));
    }
  });

  
  return {
    safetyWrapCoffeescript,
    compileCoffeescript,
    parseJavascript,
    createRootScope,
    removeHoistedDeclarations,
    rewriteJavascript,
    generateJavascript,
    compileJavascript,
    executeJavascript
  };
})();
