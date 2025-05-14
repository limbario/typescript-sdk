import WebSocket from 'ws';

/**
 * A client for interacting with a Limbar instance
 */
export type InstanceClient = {
  /**
   * Take a screenshot of the current screen
   * @returns A promise that resolves to the screenshot data
   */
  screenshot: () => Promise<ScreenshotData>;
  /**
   * Disconnect from the Limbar instance
   */
  disconnect: () => void;
};

/**
 * Controls the verbosity of logging in the client
 */
export type LogLevel = 'none' | 'error' | 'warn' | 'info' | 'debug';

/**
 * Configuration options for creating an Instance API client
 */
export type InstanceClientOptions = {
  /**
   * WebRTC endpoint URL for the Limbar instance
   */
  webrtcUrl: string;
  /**
   * Authentication token for accessing the Limbar instance
   */
  token: string;
  /**
   * Controls logging verbosity
   * @default 'info'
   */
  logLevel?: LogLevel;
};

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

/**
 * Creates a client for interacting with a Limbar instance
 * @param options Configuration options including webrtcUrl, token and log level
 * @returns An InstanceClient for controlling the instance
 */
export async function createInstanceClient(
  options: InstanceClientOptions
): Promise<InstanceClient> {
  const webrtcUrl = options.webrtcUrl;
  const token = options.token;
  const serverAddress = `${webrtcUrl}?token=${token}`;
  const logLevel = options.logLevel ?? 'info';

  let ws: WebSocket | null = null;
  const pendingScreenshotResolvers: Map<string, (value: ScreenshotData | PromiseLike<ScreenshotData>) => void> = new Map();
  const pendingScreenshotRejecters: Map<string, (reason?: any) => void> = new Map();

  // Logger functions
  const logger = {
    debug: (...args: any[]) => {
      if (logLevel === 'debug') console.log(...args);
    },
    info: (...args: any[]) => {
      if (logLevel === 'info' || logLevel === 'debug') console.log(...args);
    },
    warn: (...args: any[]) => {
      if (logLevel === 'warn' || logLevel === 'info' || logLevel === 'debug') console.warn(...args);
    },
    error: (...args: any[]) => {
      if (logLevel !== 'none') console.error(...args);
    }
  };

  return new Promise<InstanceClient>((resolveConnection, rejectConnection) => {
    logger.info(`Attempting to connect to WebSocket server at ${serverAddress}...`);
    ws = new WebSocket(serverAddress);

    ws.on('open', () => {
      logger.info(`Connected to ${serverAddress}`);
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
        logger.error('Failed to parse JSON message:', data);
        return;
      }

      switch (message.type) {
        case 'screenshot':
          if (!('dataUri' in message) || typeof message.dataUri !== 'string' || !('sessionId' in message)) {
            logger.warn('Received invalid screenshot message:', message);
            break;
          }

          const screenshotMessage = message as ScreenshotResponse;
          const resolver = pendingScreenshotResolvers.get(screenshotMessage.sessionId);

          if (!resolver) {
            logger.warn(`Received screenshot data for unknown or already handled session: ${screenshotMessage.sessionId}`);
            break;
          }

          logger.info(`Received screenshot data URI for session ${screenshotMessage.sessionId}.`);
          resolver({ dataUri: screenshotMessage.dataUri });
          pendingScreenshotResolvers.delete(screenshotMessage.sessionId);
          pendingScreenshotRejecters.delete(screenshotMessage.sessionId);
          break;

        case 'screenshotError':
          if (!('message' in message) || !('sessionId' in message)) {
            logger.warn('Received invalid screenshot error message:', message);
            break;
          }

          const errorMessage = message as ScreenshotErrorResponse;
          const rejecter = pendingScreenshotRejecters.get(errorMessage.sessionId);

          if (!rejecter) {
            logger.warn(`Received screenshot error for unknown or already handled session: ${errorMessage.sessionId}`);
            break;
          }

          logger.error(`Server reported an error capturing screenshot for session ${errorMessage.sessionId}:`, errorMessage.message);
          rejecter(new Error(errorMessage.message));
          pendingScreenshotResolvers.delete(errorMessage.sessionId);
          pendingScreenshotRejecters.delete(errorMessage.sessionId);
          break;

        default:
          logger.warn(`Received unexpected message type: ${message.type}`);
          // If there are pending promises, reject them with an error
          if (pendingScreenshotResolvers.size > 0) {
            const error = new Error(`Received unexpected message type: ${message.type}`);
            pendingScreenshotRejecters.forEach(rejecter => rejecter(error));
            pendingScreenshotResolvers.clear();
            pendingScreenshotRejecters.clear();
          }
          break;
      }
    });

    ws.on('error', (err: Error) => {
      logger.error('WebSocket error:', err.message);
      if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN && !pendingScreenshotRejecters.size)) {
        rejectConnection(err);
      }
      pendingScreenshotRejecters.forEach(rejecter => rejecter(err));
      pendingScreenshotResolvers.clear();
      pendingScreenshotRejecters.clear();
    });

    ws.on('close', () => {
      logger.info('Disconnected from server.');
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

        logger.info('Sending screenshot request:', screenshotRequest);
        ws!.send(JSON.stringify(screenshotRequest), (err?: Error) => {
          if (err) {
            logger.error('Failed to send screenshot request:', err);
            pendingScreenshotResolvers.delete(sessionId);
            pendingScreenshotRejecters.delete(sessionId);
            reject(err);
          }
        });

        setTimeout(() => {
          if (pendingScreenshotResolvers.has(sessionId)) {
            logger.error(`Screenshot request timed out for session ${sessionId}`);
            pendingScreenshotRejecters.get(sessionId)?.(new Error('Screenshot request timed out'));
            pendingScreenshotResolvers.delete(sessionId);
            pendingScreenshotRejecters.delete(sessionId);
          }
        }, 30000);
      });
    };

    const disconnect = (): void => {
      if (ws) {
        logger.info('Closing WebSocket connection.');
        ws.close();
      }
    };
  });
}
