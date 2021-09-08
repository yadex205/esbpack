import path from 'path';

import * as esbuild from 'esbuild';

const SRC_DIR = path.join(__dirname, '../src');
const DIST_DIR = path.join(__dirname, '../dist');

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

(async () => {
  const devServerClientJsBuildResult = await esbuild.build({
    entryPoints: [path.join(SRC_DIR, 'dev-server-client.ts')],
    outfile: path.join(DIST_DIR, 'dev-server-client.js'),
    write: false,

    bundle: true,
    format: 'iife',
    minify: true,
    platform: 'browser',
  });
  const devServerClientJsSource = devServerClientJsBuildResult.outputFiles[0].text;

  await esbuild.build({
    entryPoints: [path.join(SRC_DIR, 'index.ts')],
    outfile: path.join(DIST_DIR, 'index.js'),
    write: true,

    bundle: true,

    format: 'cjs',
    minify: true,
    platform: 'node',
    target: 'node12',

    define: {
      __esbpackInternalDevServerClientJsSource__: JSON.stringify(devServerClientJsSource),
    },

    plugins: [externalizeNodeModulesPlugin],
  });
})();
