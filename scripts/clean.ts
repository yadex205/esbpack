import fs from 'fs';
import path from 'path';

const PKG_DIR = path.join(__dirname, '../packages');

fs.rmSync(path.join(PKG_DIR, 'esbpack/dist'), { force: true, recursive: true });
fs.rmSync(path.join(PKG_DIR, 'esbuild-plugin-esbpack-external-file/dist'), { force: true, recursive: true });
