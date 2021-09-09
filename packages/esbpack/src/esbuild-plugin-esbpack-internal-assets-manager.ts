import { EsbpackPlugin } from './';

export const esbpackInternalAssetsManagerPlugin: EsbpackPlugin = ({ assetsManager, logger }) => ({
  name: 'esbpack-internal-assets-manager',
  setup: build => {
    if (build.initialOptions.write) {
      const error = new Error("esbpack-internal-assets-manager: esbuild's `write` option should be falsey.");
      logger.fatal(error);
      throw error;
    }

    build.onEnd(buildResult => {
      if (!buildResult.outputFiles) {
        const error = new Error("esbpack-internal-assets-manager: esbuild's `write` option should be falsey.");
        logger.fatal(error);
        throw error;
      }

      buildResult.outputFiles.forEach(file => {
        assetsManager.addAssetToStaging(file.path, Buffer.from(file.contents));
      });
    });
  },
});
