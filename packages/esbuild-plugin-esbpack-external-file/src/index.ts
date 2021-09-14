import fs from 'fs';

import { loadConfig, createMatchPath } from 'tsconfig-paths';

import { EsbpackPlugin } from 'esbpack';

const resolveByTsconfigPaths = (() => {
  const tsconfig = loadConfig();
  if (tsconfig.resultType === 'failed') {
    return undefined;
  }

  return createMatchPath(tsconfig.absoluteBaseUrl, tsconfig.paths);
})();

const resolve = (id: string) => {
  return resolveByTsconfigPaths ? resolveByTsconfigPaths(id) || require.resolve(id) : require.resolve(id);
};

interface EsbpackExternalFilePluginOptions {
  test: RegExp;
  publicPath: (moduleAbsolutePath: string) => string;
  outputPath: (moduleAbsolutePath: string) => string;
}

export const esbpackExternalFilePlugin: (pluginOptions: EsbpackExternalFilePluginOptions) => EsbpackPlugin =
  pluginOptions =>
  ({ logger }) => ({
    name: 'esbpack-external-file',
    setup: build => {
      const externalFiles = new Map<string, Buffer>();

      build.onStart(() => {
        externalFiles.clear();
      });

      build.onResolve({ filter: /.*/, namespace: 'file' }, resolveArgs => {
        try {
          const resolvedPath = resolve(resolveArgs.path);
          if (resolvedPath.match(pluginOptions.test)) {
            return {
              path: resolvedPath,
              namespace: 'esbpack-external-file',
            };
          }
        } catch {
          return undefined;
        }

        return undefined;
      });

      build.onLoad({ filter: /.*/, namespace: 'esbpack-external-file' }, async loadArgs => {
        const publicPath = pluginOptions.publicPath(loadArgs.path);
        const outputPath = pluginOptions.outputPath(loadArgs.path);

        try {
          const contents = await fs.promises.readFile(loadArgs.path);
          externalFiles.set(outputPath, contents);

          return {
            contents: publicPath,
            loader: 'text',
          };
        } catch (error) {
          const { message } = error as Error;

          return {
            errors: [{ text: message, detail: error }],
          };
        }
      });

      build.onEnd(buildResult => {
        if (!buildResult.outputFiles) {
          logger.error("esbpack-external-file-plugin: esbuild's `write` option should be falsey.");
          return;
        }

        for (const [filePath, fileContents] of externalFiles) {
          buildResult.outputFiles.push({
            path: filePath,
            contents: fileContents,
            get text() {
              return fileContents.toString();
            },
          });
        }
      });
    },
  });
