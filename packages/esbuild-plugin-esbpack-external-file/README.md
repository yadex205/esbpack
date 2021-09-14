@esbpack/esbuild-plugin-esbpack-external-file
=============================================

An external file handling plugin for esbuild+esbpack.

## Example

```ts
// build.ts

import { esbpack } from 'esbpack';
import { esbpackExternalFilePlugin } from '@esbpack/esbuild-plugin-esbpack-external-file';

esbpack({
  defineBuilds: (build, { useEsbpackPlugin }) => {
    build({
      entryPoints: ['path/to/file.ts'],
      outfile: 'path/to/output.js',

      bundle: true,

      watch: true,
    });

    build({
      entryPoints: ['path/to/file.css'],
      outfile: 'path/to/output.css',

      bundle: true,

      watch: true,

      plugins: [
        useEsbpackPlugin(esbpackExternalFilePlugin({
          test: /\.jpg$/,
          publicPath: moduleAbsolutePath => '/' + path.relative('path/to/base', moduleAbsolutePath),
          outputPath: moduleAbsolutePath => path.join('path/to/dist/base', path.relative('path/to/base', moduleAbsolutePath)),
        })),
      ],
    });
  },
  devServer: {
    port: 8000,
    publicDir: '/',
    serveDir: './dist'
  }
});

```
