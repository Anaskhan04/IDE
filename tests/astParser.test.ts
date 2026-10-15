import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeSourceFile,
  analyzeHtmlFile,
  analyzeCssFile,
  resolveImportPath,
  buildGraphFromFiles,
  normalizePath,
} from '../src/utils/astParser';
import type { ProjectFile } from '../src/types/ide';

describe('Dependency Detection and Knowledge Graph', () => {
  describe('HTML Dependency Detection', () => {
    it('detects standard <link rel="stylesheet" href="..."> and <script src="...">', () => {
      const indexFile: ProjectFile = {
        id: 'file-html-1',
        name: 'index.html',
        path: 'index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <h1>Hello</h1>
  <script src="script.js"></script>
</body>
</html>`,
      };

      const cssFile: ProjectFile = {
        id: 'file-css-1',
        name: 'style.css',
        path: 'style.css',
        language: 'css',
        content: 'body { color: red; }',
      };

      const jsFile: ProjectFile = {
        id: 'file-js-1',
        name: 'script.js',
        path: 'script.js',
        language: 'javascript',
        content: 'console.log("hello");',
      };

      const files = [indexFile, cssFile, jsFile];
      const analysis = analyzeHtmlFile(indexFile, files);

      assert.strictEqual(analysis.imports.length, 2);

      const styleImport = analysis.imports.find((i) => i.specifier === 'style.css');
      assert.ok(styleImport, 'style.css import should be detected');
      assert.strictEqual(styleImport.resolvedPath, 'style.css');
      assert.strictEqual(styleImport.line, 4);

      const scriptImport = analysis.imports.find((i) => i.specifier === 'script.js');
      assert.ok(scriptImport, 'script.js import should be detected');
      assert.strictEqual(scriptImport.resolvedPath, 'script.js');
      assert.strictEqual(scriptImport.line, 8);
    });

    it('detects varied attribute order, relative dots, and multi-line tags', () => {
      const htmlFile: ProjectFile = {
        id: 'file-html-2',
        name: 'index.html',
        path: 'public/index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html>
<head>
  <link href="./theme.css" rel="stylesheet" type="text/css">
  <link
    rel="stylesheet"
    href="/global.css"
  />
</head>
<body>
  <script
    type="module"
    src="./main.js"
  ></script>
  <script defer src="vendor.js"></script>
</body>
</html>`,
      };

      const themeCss: ProjectFile = {
        id: 'file-css-theme',
        name: 'theme.css',
        path: 'public/theme.css',
        language: 'css',
        content: '',
      };
      const globalCss: ProjectFile = {
        id: 'file-css-global',
        name: 'global.css',
        path: 'global.css',
        language: 'css',
        content: '',
      };
      const mainJs: ProjectFile = {
        id: 'file-js-main',
        name: 'main.js',
        path: 'public/main.js',
        language: 'javascript',
        content: '',
      };
      const vendorJs: ProjectFile = {
        id: 'file-js-vendor',
        name: 'vendor.js',
        path: 'public/vendor.js',
        language: 'javascript',
        content: '',
      };

      const files = [htmlFile, themeCss, globalCss, mainJs, vendorJs];
      const analysis = analyzeHtmlFile(htmlFile, files);

      assert.strictEqual(analysis.imports.length, 4);
      assert.strictEqual(analysis.imports.find((i) => i.specifier === './theme.css')?.resolvedPath, 'public/theme.css');
      assert.strictEqual(analysis.imports.find((i) => i.specifier === '/global.css')?.resolvedPath, 'global.css');
      assert.strictEqual(analysis.imports.find((i) => i.specifier === './main.js')?.resolvedPath, 'public/main.js');
      assert.strictEqual(analysis.imports.find((i) => i.specifier === 'vendor.js')?.resolvedPath, 'public/vendor.js');
    });

    it('extracts functions and function calls from inline <script> tags', () => {
      const htmlFile: ProjectFile = {
        id: 'file-html-inline',
        name: 'index.html',
        path: 'index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html>
<body>
  <script>
    function initializeWidget() {
      renderContent();
    }
    initializeWidget();
  </script>
</body>
</html>`,
      };

      const analysis = analyzeHtmlFile(htmlFile, [htmlFile]);
      const fnSymbol = analysis.symbols.find((s) => s.name === 'initializeWidget');
      assert.ok(fnSymbol, 'inline function initializeWidget should be extracted as a symbol');
      assert.strictEqual(fnSymbol.kind, 'function');

      const call1 = analysis.calls.find((c) => c.calleeName === 'renderContent');
      const call2 = analysis.calls.find((c) => c.calleeName === 'initializeWidget');
      assert.ok(call1, 'call to renderContent should be extracted');
      assert.ok(call2, 'call to initializeWidget should be extracted');
    });

    it('ignores external CDN URLs in <link> and <script>', () => {
      const htmlFile: ProjectFile = {
        id: 'file-html-cdn',
        name: 'index.html',
        path: 'index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="https://cdn.example.com/bootstrap.min.css">
  <link rel="stylesheet" href="//cdn.example.com/font.css">
  <script src="https://cdn.example.com/jquery.js"></script>
  <link rel="stylesheet" href="style.css?v=123">
</head>
</html>`,
      };

      const cssFile: ProjectFile = {
        id: 'file-css-local',
        name: 'style.css',
        path: 'style.css',
        language: 'css',
        content: '',
      };

      const analysis = analyzeHtmlFile(htmlFile, [htmlFile, cssFile]);
      const cdnLink = analysis.imports.find((i) => i.specifier.includes('bootstrap'));
      assert.strictEqual(cdnLink?.resolvedPath, undefined, 'CDN stylesheet must not resolve to local file');

      const localLink = analysis.imports.find((i) => i.specifier.startsWith('style.css'));
      assert.ok(localLink);
      assert.strictEqual(localLink.resolvedPath, 'style.css', 'Query strings should be stripped when resolving');
    });
  });

  describe('CSS @import Dependency Detection', () => {
    it('detects string and url() forms of CSS @import', () => {
      const mainCss: ProjectFile = {
        id: 'file-css-main',
        name: 'main.css',
        path: 'src/styles/main.css',
        language: 'css',
        content: `@import "reset.css";
@import './theme.css';
@import url("fonts.css");
@import url('vars.css');
@import url(base.css);
body { margin: 0; }`,
      };

      const otherCssFiles: ProjectFile[] = [
        { id: '1', name: 'reset.css', path: 'src/styles/reset.css', language: 'css', content: '' },
        { id: '2', name: 'theme.css', path: 'src/styles/theme.css', language: 'css', content: '' },
        { id: '3', name: 'fonts.css', path: 'src/styles/fonts.css', language: 'css', content: '' },
        { id: '4', name: 'vars.css', path: 'src/styles/vars.css', language: 'css', content: '' },
        { id: '5', name: 'base.css', path: 'src/styles/base.css', language: 'css', content: '' },
      ];

      const allFiles = [mainCss, ...otherCssFiles];
      const analysis = analyzeCssFile(mainCss, allFiles);

      assert.strictEqual(analysis.imports.length, 5);
      assert.strictEqual(analysis.imports[0].resolvedPath, 'src/styles/reset.css');
      assert.strictEqual(analysis.imports[1].resolvedPath, 'src/styles/theme.css');
      assert.strictEqual(analysis.imports[2].resolvedPath, 'src/styles/fonts.css');
      assert.strictEqual(analysis.imports[3].resolvedPath, 'src/styles/vars.css');
      assert.strictEqual(analysis.imports[4].resolvedPath, 'src/styles/base.css');
    });
  });

  describe('JavaScript Imports and Function Calls', () => {
    it('detects ES imports, CommonJS require, and dynamic import', () => {
      const jsFile: ProjectFile = {
        id: 'file-js-test',
        name: 'app.js',
        path: 'src/app.js',
        language: 'javascript',
        content: `import { helper } from './utils/helper.js';
const logger = require('./utils/logger');
async function loadPlugin() {
  const mod = await import('./plugins/plugin');
}
helper();`,
      };

      const helperFile: ProjectFile = {
        id: 'file-helper',
        name: 'helper.js',
        path: 'src/utils/helper.js',
        language: 'javascript',
        content: 'export function helper() {}',
      };
      const loggerFile: ProjectFile = {
        id: 'file-logger',
        name: 'logger.js',
        path: 'src/utils/logger.js',
        language: 'javascript',
        content: 'module.exports = {};',
      };
      const pluginFile: ProjectFile = {
        id: 'file-plugin',
        name: 'plugin.js',
        path: 'src/plugins/plugin.js',
        language: 'javascript',
        content: 'export default {};',
      };

      const files = [jsFile, helperFile, loggerFile, pluginFile];
      const analysis = analyzeSourceFile(jsFile, files);

      assert.strictEqual(analysis.imports.length, 3);
      assert.strictEqual(analysis.imports.find((i) => i.specifier === './utils/helper.js')?.resolvedPath, 'src/utils/helper.js');
      assert.strictEqual(analysis.imports.find((i) => i.specifier === './utils/logger')?.resolvedPath, 'src/utils/logger.js');
      assert.strictEqual(analysis.imports.find((i) => i.specifier === './plugins/plugin')?.resolvedPath, 'src/plugins/plugin.js');

      const call = analysis.calls.find((c) => c.calleeName === 'helper');
      assert.ok(call, 'helper() call should be extracted');
    });
  });

  describe('Master Graph Builder (buildGraphFromFiles)', () => {
    it('correctly connects index.html to style.css and script.js', () => {
      const indexFile: ProjectFile = {
        id: 'idx-1',
        name: 'index.html',
        path: 'index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <h1>Test App</h1>
  <script src="script.js"></script>
</body>
</html>`,
      };

      const styleFile: ProjectFile = {
        id: 'css-1',
        name: 'style.css',
        path: 'style.css',
        language: 'css',
        content: `body {
  margin: 0;
  background-color: #121212;
}`,
      };

      const scriptFile: ProjectFile = {
        id: 'js-1',
        name: 'script.js',
        path: 'script.js',
        language: 'javascript',
        content: `function setup() {
  console.log("App ready");
}
setup();`,
      };

      const { nodes, edges } = buildGraphFromFiles([indexFile, styleFile, scriptFile]);

      // Check node presence
      const indexNode = nodes.find((n) => n.id === `node-file-${indexFile.id}`);
      const styleNode = nodes.find((n) => n.id === `node-file-${styleFile.id}`);
      const scriptNode = nodes.find((n) => n.id === `node-file-${scriptFile.id}`);
      const setupNode = nodes.find((n) => n.id === `node-sym-${scriptFile.id}-setup`);

      assert.ok(indexNode, 'index.html node should exist');
      assert.ok(styleNode, 'style.css node should exist');
      assert.ok(scriptNode, 'script.js node should exist');
      assert.ok(setupNode, 'setup() function node should exist');

      // Verify architecture container areas
      assert.strictEqual(styleNode.architectureArea, 'frontend', 'style.css should be in frontend container');
      assert.strictEqual(indexNode.architectureArea, 'core', 'index.html should be in core container');
      assert.strictEqual(scriptNode.architectureArea, 'core', 'script.js should be in core container');

      // Verify IMPORTS edges from index.html
      const htmlToCssEdge = edges.find(
        (e) => e.source === indexNode.id && e.target === styleNode.id && e.type === 'IMPORTS'
      );
      assert.ok(htmlToCssEdge, 'IMPORTS edge from index.html to style.css MUST exist');
      assert.strictEqual(htmlToCssEdge.label, 'IMPORTS');

      const htmlToJsEdge = edges.find(
        (e) => e.source === indexNode.id && e.target === scriptNode.id && e.type === 'IMPORTS'
      );
      assert.ok(htmlToJsEdge, 'IMPORTS edge from index.html to script.js MUST exist');
      assert.strictEqual(htmlToJsEdge.label, 'IMPORTS');

      // Verify CALLS edge in script.js
      const scriptCallEdge = edges.find(
        (e) => e.target === setupNode.id && e.type === 'CALLS'
      );
      assert.ok(scriptCallEdge, 'CALLS edge to setup() MUST exist');

      // Verify connectionsCount on nodes
      assert.ok((indexNode.connectionsCount ?? 0) >= 2, 'index.html should have at least 2 connections');
      assert.ok((styleNode.connectionsCount ?? 0) >= 1, 'style.css should have at least 1 connection');
      assert.ok((scriptNode.connectionsCount ?? 0) >= 1, 'script.js should have at least 1 connection');
    });
  });
});
