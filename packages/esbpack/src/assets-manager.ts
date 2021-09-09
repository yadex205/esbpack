import crypto from 'crypto';

interface Asset {
  contents: Buffer;
  digest: Buffer;
}

type StagingAsset = (Asset & { deleted?: false }) | { deleted: true };

export class AssetsManager {
  private assets = new Map<string, Asset>();
  private stagingAssets = new Map<string, StagingAsset>();

  public update = (filePath: string, contents: Buffer) => {
    const hash = crypto.createHash('md5');
    const prevDigest = this.assets.get(filePath)?.digest;
    const nextDigest = hash.update(contents).digest();

    if (prevDigest && Buffer.compare(prevDigest, nextDigest) === 0) {
      return { updated: false };
    }

    this.assets.set(filePath, {
      contents,
      digest: nextDigest,
    });
    return { updated: true };
  };

  public addAssetToStaging = (filePath: string, contents: Buffer) => {
    const hash = crypto.createHash('md5');
    const digest = hash.update(contents).digest();
    this.stagingAssets.set(filePath, { contents, digest });
  };

  public setDeleteFlagToAsset = (filePath: string) => {
    this.stagingAssets.set(filePath, { deleted: true });
  };

  public commit = () => {
    const updatedFilePaths: string[] = [];
    const removedFilePaths: string[] = [];

    for (const [filePath, stagingAsset] of this.stagingAssets.entries()) {
      if (stagingAsset.deleted) {
        removedFilePaths.push(filePath);
      } else {
        const existingAsset = this.assets.get(filePath);

        if (existingAsset && Buffer.compare(existingAsset.digest, stagingAsset.digest) === 0) {
          continue;
        }

        updatedFilePaths.push(filePath);
        this.assets.set(filePath, stagingAsset);
      }
    }

    this.stagingAssets.clear();
    return { updatedFilePaths, removedFilePaths };
  };

  public getAsset = (filePath: string) => {
    return this.assets.get(filePath);
  };

  public allAssets = () => this.assets.entries();
}

export const assetsManager = new AssetsManager();
