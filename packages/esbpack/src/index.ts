import { mkdir, writeFile } from 'fs/promises';
import { dirname } from 'path';

import * as esbuild from 'esbuild';

import { assetsManager, AssetsManager } from './assets-manager';
import { createDevServer } from './dev-server';
import { esbpackInternalAssetsManagerPlugin } from './esbuild-plugin-esbpack-internal-assets-manager';
import { logger } from './logger';

export interface EsbpackPluginArgs {
  assetsManager: AssetsManager;
  logger: typeof logger;
}

export type EsbpackPlugin = (args: EsbpackPluginArgs) => esbuild.Plugin;

export type EsbpackBuildOptions = Omit<esbuild.BuildOptions, 'write'>;

export interface EsbpackDefineBuildsUtils {
  useEsbpackPlugin: (plugin: EsbpackPlugin) => esbuild.Plugin;
}

export interface EsbpackOptions {
  defineBuilds: (build: (options: EsbpackBuildOptions) => void, utils: EsbpackDefineBuildsUtils) => void;
  onAllBuildsFinished?: (args: { assetsManager: AssetsManager }) => {};
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
    esbpackOptions.onAllBuildsFinished?.({ assetsManager });

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

  const useEsbpackPlugin: EsbpackDefineBuildsUtils['useEsbpackPlugin'] = plugin => {
    return plugin({ assetsManager, logger });
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
        plugins: [...(buildOptions.plugins || []), useEsbpackPlugin(esbpackInternalAssetsManagerPlugin)],
      })
    );
  };

  esbpackOptions.defineBuilds(build, { useEsbpackPlugin });
  await Promise.all(builds);

  _onAllBuildsFinished();
  devServer?.start();
};
