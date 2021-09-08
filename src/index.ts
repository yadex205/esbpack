import { mkdir, writeFile } from 'fs/promises';
import { dirname } from 'path';

import * as esbuild from 'esbuild';

import { assetsManager, AssetsManager } from './assets-manager';
import { createDevServer } from './dev-server';
import { logger } from './logger';

const esbpackInternalAssetsManagerPlugin = (): esbuild.Plugin => ({
  name: 'esbpack-internal-assets-manager-plugin',
  setup: build => {
    if (build.initialOptions.write) {
      const error = new Error("esbpack-internal-assets-manager-plugin: esbuild's `write` option should be falsey.");
      logger.fatal(error);
      throw error;
    }

    build.onEnd(buildResult => {
      if (!buildResult.outputFiles) {
        const error = new Error("esbpack-internal-assets-manager-plugin: esbuild's `write` option should be falsey.");
        logger.fatal(error);
        throw error;
      }

      buildResult.outputFiles.forEach(file => {
        assetsManager.addAssetToStaging(file.path, Buffer.from(file.contents));
      });
    });
  },
});

export type EsbpackBuildOptions = Omit<esbuild.BuildOptions, 'write'>;

export interface EsbpackOptions {
  defineBuilds: (build: (options: EsbpackBuildOptions) => void) => void;
  onAllBuildsFinished?: (assetsManager: AssetsManager) => {};
  devServer?: {
    port?: number;
    publicDir?: string;
    serveDir?: string;
  };
  write?: boolean;
}

export const esbpack = async (esbpackOptions: EsbpackOptions) => {
  const builds: Promise<esbuild.BuildResult>[] = [];
  const devServer = esbpackOptions.devServer ? createDevServer(esbpackOptions.devServer) : undefined;

  const _onAllBuildsFinished = async () => {
    esbpackOptions.onAllBuildsFinished?.(assetsManager);

    const { updatedFilePaths } = assetsManager.commit();

    if (esbpackOptions.write) {
      for (const [filePath, asset] of assetsManager.allAssets()) {
        await mkdir(dirname(filePath), { recursive: true });
        await writeFile(filePath, asset.contents);
      }
    }

    if (devServer) {
      devServer.reloadFiles(updatedFilePaths);
    }
  };

  const build: (buildOptions: EsbpackBuildOptions) => void = buildOptions => {
    builds.push(
      esbuild.build({
        ...buildOptions,
        write: false,
        watch: buildOptions.watch
          ? {
              onRebuild: (error, result) => {
                if (buildOptions.watch && typeof buildOptions.watch !== 'boolean' && buildOptions.watch.onRebuild) {
                  buildOptions.watch.onRebuild(error, result);
                }
                _onAllBuildsFinished();
              },
            }
          : undefined,
        plugins: [...(buildOptions.plugins || []), esbpackInternalAssetsManagerPlugin()],
      })
    );
  };

  esbpackOptions.defineBuilds(build);
  await Promise.all(builds);

  _onAllBuildsFinished();
  devServer?.start();
};
