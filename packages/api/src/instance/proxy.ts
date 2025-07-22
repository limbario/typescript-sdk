import * as net from 'net';
import WebSocket from 'modern-isomorphic-ws';

/** Returned by `startTcpProxy` – holds the chosen localhost port and a cleanup callback. */
export interface ProxyHandle {
  port: number;
  cleanup: () => void;
}

/**
 * Starts a one-shot TCP → WebSocket proxy.
 *
 * The function creates a local TCP server that listens on an ephemeral port on
 * 127.0.0.1.  As soon as the **first** TCP client connects the server stops
 * accepting further connections and forwards all traffic between that client
 * and `remoteURL` through an authenticated WebSocket.  If you need to proxy
 * more than one TCP connection, call `startTcpProxy` again to create a new
 * proxy instance.
 *
 * @param remoteURL Remote WebSocket endpoint (e.g. wss://example.com/instance)
 * @param token     Bearer token sent as `Authorization` header
 * @param signal    Optional `AbortSignal` for cancellation
 */
export async function startTcpProxy(
  remoteURL: string,
  token: string,
  signal?: AbortSignal
): Promise<ProxyHandle> {
  // Disallow usage in browsers
  if (typeof window !== 'undefined' && typeof (window as any).document !== 'undefined') {
    throw new Error('startTcpProxy cannot be used in a browser environment');
  }
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    let ws: WebSocket | undefined;
    let pingInterval: NodeJS.Timeout | undefined;

    // Cleanup helper
    const cleanup = () => {
      if (pingInterval) {
        clearInterval(pingInterval);
        pingInterval = undefined;
      }
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close(1000, 'cleanup');
      }
      if (server.listening) {
        server.close();
      }
    };

    // Abort support
    if (signal?.aborted) {
      return reject(new Error('Operation aborted before start'));
    }
    signal?.addEventListener('abort', () => {
      cleanup();
      reject(new Error('Operation aborted'));
    });

    // TCP server error
    server.once('error', (err) => {
      cleanup();
      reject(new Error(`TCP server error: ${err.message}`));
    });

    // Listening
    server.once('listening', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        cleanup();
        return reject(new Error('Failed to obtain listening address'));
      }
      resolve({ port: address.port, cleanup });
    });

    // On first TCP connection
    server.on('connection', (tcpSocket) => {
      // Single-connection proxy
      server.close();

      ws = new WebSocket(remoteURL, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // WebSocket error
      ws.once('error', (err) => {
        console.error('WebSocket error:', err);
        tcpSocket.destroy();
        cleanup();
      });

      ws.once('open', () => {
        const socket = ws as WebSocket; // non-undefined after open

        pingInterval = setInterval(() => {
            if (socket.readyState === WebSocket.OPEN) {
              (socket as any).ping();
            }
          }, 30_000);

        // TCP → WS
        tcpSocket.on('data', (chunk) => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(chunk);
          }
        });

        // WS → TCP
        socket.on('message', (data) => {
          if (!tcpSocket.destroyed) {
            tcpSocket.write(data as Buffer);
          }
        });
      });

      // Mutual cleanup
      tcpSocket.on('close', cleanup);
      tcpSocket.on('error', (err) => {
        console.error('TCP socket error:', err);
        cleanup();
      });

      ws.on('close', () => tcpSocket.destroy());
    });

    // Start listening
    server.listen(0, '127.0.0.1');
  });
}
