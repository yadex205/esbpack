import path from 'path';

import * as esbuild from 'esbuild';

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

esbuild.build({
  entryPoints: [path.join(PKG_DIR, 'esbpack/src/dev-server-client.ts')],
  outfile: path.join(PKG_DIR, 'esbpack/dist/dev-server-client.js'),

  bundle: true,
  format: 'iife',
  minify: true,
  platform: 'browser',
});

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
