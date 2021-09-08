import fs from 'fs';
import path from 'path';

import fastifyFactory from 'fastify';
import fastifyWebsocket, { SocketStream } from 'fastify-websocket';
import mime from 'mime-types';

import { assetsManager } from './assets-manager';
import { logger } from './logger';

const devServerClientJsSource = fs.readFileSync(path.join(__dirname, 'dev-server-client.js'));

export interface EsbpackDevServerEvent<E extends string = string> {
  createdAt: number;
  event: E;
}

export interface EsbpackDevServerUpdateEvent extends EsbpackDevServerEvent<'update'> {
  targets: string[];
}

export interface EsbpackDevServerOptions {
  port?: number;
  publicDir?: string;
  serveDir?: string;
}

export class EsbpackDevServer {
  private fastify: ReturnType<typeof fastifyFactory>;
  private options: Required<EsbpackDevServerOptions>;
  private sockets = new Set<SocketStream['socket']>();

  public constructor(options: EsbpackDevServerOptions = {}) {
    const _options: Required<EsbpackDevServerOptions> = {
      port: 8000,
      publicDir: '/',
      serveDir: '/',
      ...options,
    };

    const fastify = fastifyFactory();
    fastify.register(fastifyWebsocket);

    fastify.setNotFoundHandler((_, res) => {
      res.code(404).type('text/plain').send('404 Not Found');
    });

    fastify.get('/__dev-server-client.js', (_req, res) => {
      res.code(200).type('text/javascript').send(devServerClientJsSource);
    });

    fastify.get(path.join(_options.publicDir, '*'), (req, res) => {
      const requestedPathname = new URL(req.url || '', `http://${req.headers.host}`).pathname;
      const requestedFsFilePath = path.join(_options.serveDir, requestedPathname.replace(/^\//, ''));
      const candidateFsFilePaths = [requestedFsFilePath, path.join(requestedFsFilePath, 'index.html')];

      for (let index = 0; index < candidateFsFilePaths.length; index++) {
        const filePath = candidateFsFilePaths[index];
        let contents: Buffer | string | undefined = assetsManager.getAsset(filePath)?.contents;
        if (!contents) {
          continue;
        }

        if (filePath.match(/\.html$/)) {
          contents = contents
            .toString()
            .replace(/(\s*<\/head>)/, '<script src="/__dev-server-client.js"></script>\n$1');
        }

        res
          .code(200)
          .headers({
            'Content-Type': mime.contentType(path.extname(filePath) || 'application/octet-stream'),
          })
          .send(contents);
        return;
      }

      res.callNotFound();
    });

    fastify.get('/__websocket', { websocket: true }, ({ socket: ws }, req) => {
      const { remoteAddress, remotePort } = req.socket;
      const userAgent = req.headers['user-agent'] || '';

      this.sockets.add(ws);
      logger.info(`esbpack-dev-server: Connected from ${remoteAddress}:${remotePort} (${userAgent})`);

      ws.on('close', () => {
        this.sockets.delete(ws);
        logger.info(`esbpack-dev-server: Closed connection with ${remoteAddress}:${remotePort} (${userAgent})`);
      });
    });

    this.fastify = fastify;
    this.options = _options;
  }

  public start = (): void => {
    this.fastify.listen(this.options.port, (error, address) => {
      if (error) {
        throw error;
      }

      logger.info(`esbpack-dev-server: Server is listening at ${address}`);
    });
  };

  public reloadFiles = (filePaths: string[]) => {
    const updateEvent: EsbpackDevServerUpdateEvent = {
      createdAt: Date.now(),
      event: 'update',
      targets: filePaths.map(filePathOnFs => {
        const pathnameOnServer = path.join(this.options.publicDir, path.relative(this.options.serveDir, filePathOnFs));
        logger.info(`esbpack-dev-server: Updated: ${pathnameOnServer}`);
        return pathnameOnServer;
      }),
    };

    this.sendEventToClient(updateEvent);
  };

  private sendEventToClient = <E extends EsbpackDevServerEvent>(event: E) => {
    const serializedEvent = JSON.stringify(event);

    this.sockets.forEach(ws => {
      ws.send(serializedEvent);
    });
  };
}

export const createDevServer = (options?: EsbpackDevServerOptions): EsbpackDevServer => new EsbpackDevServer(options);
