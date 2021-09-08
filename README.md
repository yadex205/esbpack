esbpack
=======

Yet another bundler for websites with esbuild.

## Installation

```bash
npm install --save-dev esbpack
```

## Quickstart

```ts
// build.ts

import { esbpack } from 'esbpack';

esbpack({
  defineBuilds: build => {
    build({
      entryPoints: ['path/to/file.ts'],
      outfile: 'path/to/output.js',

      watch: true,
    });
  },
  devServer: {
    port: 8000,
    publicDir: '/',
    serveDir: './dist'
  }
});
```

## License

MIT
