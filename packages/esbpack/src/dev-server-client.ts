import { EsbpackDevServerEvent, EsbpackDevServerUpdateEvent } from './dev-server';

const url = `ws://${window.location.host}/__websocket`;
const sock = new WebSocket(url);

sock.addEventListener('message', event => {
  const devServerEvent = JSON.parse(event.data as string) as EsbpackDevServerEvent;

  if (devServerEvent.event === 'update') {
    const { createdAt: updatedAt, targets: _updatedFiles } = devServerEvent as EsbpackDevServerUpdateEvent;
    const updatedFiles = new Set(_updatedFiles);
    let replaceCount = 0;

    const filesShouldInvokePageReload = [
      window.location.pathname.replace(/\/(index.html)?$/, '') + '/index.html',
      ...Array.from(document.scripts)
        .map(scriptEl => (scriptEl.src ? new URL(scriptEl.src).pathname : ''))
        .filter(p => p),
    ];

    if (filesShouldInvokePageReload.some(pathname => updatedFiles.has(pathname))) {
      window.location.reload();
      return;
    }

    Array.from(document.styleSheets).forEach(styleSheet => {
      if (!styleSheet.href) {
        return;
      }

      const hrefUrl = new URL(styleSheet.href);
      if (updatedFiles.has(hrefUrl.pathname)) {
        const linkEl = styleSheet.ownerNode as HTMLLinkElement;
        hrefUrl.searchParams.set('updated_at', updatedAt.toString());
        linkEl.href = hrefUrl.toString();

        replaceCount++;
      }
    });

    Array.from(document.images).forEach(imageEl => {
      if (!imageEl.src) {
        return;
      }

      const srcUrl = new URL(imageEl.src);
      if (updatedFiles.has(srcUrl.pathname)) {
        srcUrl.searchParams.set('updated_at', updatedAt.toString());
        imageEl.src = srcUrl.toString();
      }
    });

    if (updatedFiles.size !== replaceCount) {
      window.location.reload();
    }
  }
});
