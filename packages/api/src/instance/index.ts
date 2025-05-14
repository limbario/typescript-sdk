import WebSocket from 'ws';

type ScreenshotRequest = {
  type: 'screenshot';
  sessionId: string;
};

type ScreenshotResponse = {
  type: 'screenshot';
  dataUri: string;
  sessionId: string;
};

type ScreenshotData = {
  dataUri: string;
};

type ScreenshotErrorResponse = {
  type: 'screenshotError';
  message: string;
  sessionId: string;
};

type ServerMessage = ScreenshotResponse | ScreenshotErrorResponse | { type: string; [key: string]: unknown };

export type InstanceClient = {
  screenshot: () => Promise<ScreenshotData>;
  disconnect: () => void;
};

export async function createInstanceClient(initialServerAddress: string): Promise<InstanceClient> {
  let ws: WebSocket | null = null;
  let serverAddress: string = initialServerAddress;
  const pendingScreenshotResolvers: Map<string, (value: ScreenshotData | PromiseLike<ScreenshotData>) => void> = new Map();
  const pendingScreenshotRejecters: Map<string, (reason?: any) => void> = new Map();

  return new Promise<InstanceClient>((resolveConnection, rejectConnection) => {
    console.log(`Attempting to connect to WebSocket server at ${serverAddress}...`);
    ws = new WebSocket(serverAddress);

    ws.on('open', () => {
      console.log(`Connected to ${serverAddress}`);
      resolveConnection({
        screenshot,
        disconnect,
      });
    });

    ws.on('message', (data: WebSocket.Data) => {
      let message: ServerMessage;
      try {
        message = JSON.parse(data.toString());
      } catch (e) {
        console.error('Failed to parse JSON message:', data);
        return;
      }

      if (message.type === 'screenshot' && 'dataUri' in message && typeof message.dataUri === 'string' && 'sessionId' in message) {
        const specificMessage = message as ScreenshotResponse;
        const resolver = pendingScreenshotResolvers.get(specificMessage.sessionId);

        if (resolver) {
          console.log(`Received screenshot data URI for session ${specificMessage.sessionId}.`);
          resolver({ dataUri: specificMessage.dataUri });
        } else {
          console.warn(`Received screenshot data for unknown or already handled session: ${specificMessage.sessionId}`);
        }
        pendingScreenshotResolvers.delete(specificMessage.sessionId);
        pendingScreenshotRejecters.delete(specificMessage.sessionId);

      } else if (message.type === 'screenshotError' && 'message' in message && 'sessionId' in message) {
        const specificMessage = message as ScreenshotErrorResponse;
        const rejecter = pendingScreenshotRejecters.get(specificMessage.sessionId);
        if (rejecter) {
          console.error(`Server reported an error capturing screenshot for session ${specificMessage.sessionId}:`, specificMessage.message);
          rejecter(new Error(specificMessage.message));
          pendingScreenshotResolvers.delete(specificMessage.sessionId);
          pendingScreenshotRejecters.delete(specificMessage.sessionId);
        } else {
          console.warn(`Received screenshot error for unknown or already handled session: ${specificMessage.sessionId}`);
        }
      } else {
        console.log('Received other message:', message);
      }
    });

    ws.on('error', (err: Error) => {
      console.error('WebSocket error:', err.message);
      if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN && !pendingScreenshotRejecters.size)) {
        rejectConnection(err);
      }
      pendingScreenshotRejecters.forEach(rejecter => rejecter(err));
      pendingScreenshotResolvers.clear();
      pendingScreenshotRejecters.clear();
    });

    ws.on('close', () => {
      console.log('Disconnected from server.');
      if (ws && ws.readyState !== WebSocket.OPEN && ws.readyState !== WebSocket.CONNECTING) {
      }
      pendingScreenshotRejecters.forEach(rejecter => rejecter(new Error('WebSocket closed unexpectedly')));
      pendingScreenshotResolvers.clear();
      pendingScreenshotRejecters.clear();
    });

    const screenshot = async (): Promise<ScreenshotData> => {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        return Promise.reject(new Error('WebSocket is not connected or connection is not open.'));
      }

      const sessionId = 'ts-client-' + Date.now();
      const screenshotRequest: ScreenshotRequest = {
        type: 'screenshot',
        sessionId: sessionId,
      };

      return new Promise<ScreenshotData>((resolve, reject) => {
        pendingScreenshotResolvers.set(sessionId, resolve);
        pendingScreenshotRejecters.set(sessionId, reject);

        console.log('Sending screenshot request:', screenshotRequest);
        ws!.send(JSON.stringify(screenshotRequest), (err?: Error) => {
          if (err) {
            console.error('Failed to send screenshot request:', err);
            pendingScreenshotResolvers.delete(sessionId);
            pendingScreenshotRejecters.delete(sessionId);
            reject(err);
          }
        });

        setTimeout(() => {
          if (pendingScreenshotResolvers.has(sessionId)) {
            console.error(`Screenshot request timed out for session ${sessionId}`);
            pendingScreenshotRejecters.get(sessionId)?.(new Error('Screenshot request timed out'));
            pendingScreenshotResolvers.delete(sessionId);
            pendingScreenshotRejecters.delete(sessionId);
          }
        }, 30000);
      });
    };

    const disconnect = (): void => {
      if (ws) {
        console.log('Closing WebSocket connection.');
        ws.close();
      }
    };
  });
}
