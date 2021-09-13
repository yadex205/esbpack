import path from 'path';

import * as esbuild from 'esbuild';
import typescript from 'typescript';

import tsconfigJson from '../tsconfig.json';

const PKG_DIR = path.join(__dirname, '../packages');

const externalizeNodeModulesPlugin: esbuild.Plugin = {
  name: 'externalize-node-modules',
  setup: build => {
    const externalDeps = new Set<string>();

    build.onResolve({ filter: /.*/, namespace: 'file' }, ({ path, kind }) => {
      if (kind === 'entry-point') {
        return undefined;
      } else if (externalDeps.has(path)) {
        return { external: true };
      }

      try {
        require.resolve(path);
        externalDeps.add(path);
        return { external: true };
      } catch {
        return undefined;
      }
    });
  },
};

// Based on https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API
const buildDts = (filePaths: string[], outDir: string) => {
  const program = typescript.createProgram(filePaths, {
    ...tsconfigJson.compilerOptions,
    module: typescript.ModuleKind.CommonJS,
    target: typescript.ScriptTarget.ES2019,
    lib: ['lib.es2019.d.ts'],
    noEmit: false,
    declaration: true,
    emitDeclarationOnly: true,
    outDir,
  });
  const emitResult = program.emit();

  const allDiagnostics = typescript.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);
  allDiagnostics.forEach(diagnostic => {
    if (diagnostic.file) {
      const { line, character } = typescript.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start!);
      const message = typescript.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
      console.warn(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
    } else {
      console.warn(`${typescript.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`);
    }
  });

  if (emitResult.emitSkipped) {
    throw new Error(`Failed export d.ts to ${outDir}`);
  }
};

esbuild.build({
  entryPoints: [path.join(PKG_DIR, 'esbpack/src/dev-server-client.ts')],
  outfile: path.join(PKG_DIR, 'esbpack/dist/dev-server-client.js'),

  bundle: true,
  format: 'iife',
  minify: true,
  platform: 'browser',
});

buildDts(
  [
    'assets-manager.ts',
    'dev-server.ts',
    'esbuild-plugin-esbpack-internal-assets-manager.ts',
    'index.ts',
    'logger.ts',
  ].map(basename => path.join(PKG_DIR, 'esbpack/src', basename)),
  path.join(PKG_DIR, 'esbpack/dist')
);

esbuild.build({
  entryPoints: [path.join(PKG_DIR, 'esbpack/src/index.ts')],
  outfile: path.join(PKG_DIR, 'esbpack/dist/index.js'),

  bundle: true,

  format: 'cjs',
  minify: true,
  platform: 'node',
  target: 'node12',

  plugins: [externalizeNodeModulesPlugin],
});
