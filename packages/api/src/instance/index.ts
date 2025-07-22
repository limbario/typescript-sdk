import WebSocket from "modern-isomorphic-ws";

import { startTcpProxy } from './proxy.js';
import type { ProxyHandle } from './proxy.js';
export type { ProxyHandle } from './proxy.js';

import { exec } from 'node:child_process';

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

  /**
   * Establish an ADB tunnel to the instance.
   * Returns the local TCP port and a cleanup function.
   */
  startAdbTunnel: () => Promise<ProxyHandle>;
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
   * Connection URL for the Limbar instance
   */
  adbUrl: string;
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
  id: string;
};

type ScreenshotResponse = {
  type: 'screenshot';
  dataUri: string;
  id: string;
};

type ScreenshotData = {
  dataUri: string;
};

type ScreenshotErrorResponse = {
  type: 'screenshotError';
  message: string;
  id: string;
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
  const token = options.token;
  const serverAddress = `${options.webrtcUrl}?token=${token}`;
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
        startAdbTunnel,
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
          if (!('dataUri' in message) || typeof message.dataUri !== 'string' || !('id' in message)) {
            logger.warn('Received invalid screenshot message:', message);
            break;
          }

          const screenshotMessage = message as ScreenshotResponse;
          const resolver = pendingScreenshotResolvers.get(screenshotMessage.id);

          if (!resolver) {
            logger.warn(`Received screenshot data for unknown or already handled session: ${screenshotMessage.id}`);
            break;
          }

          logger.info(`Received screenshot data URI for session ${screenshotMessage.id}.`);
          resolver({ dataUri: screenshotMessage.dataUri });
          pendingScreenshotResolvers.delete(screenshotMessage.id);
          pendingScreenshotRejecters.delete(screenshotMessage.id);
          break;

        case 'screenshotError':
          if (!('message' in message) || !('id' in message)) {
            logger.warn('Received invalid screenshot error message:', message);
            break;
          }

          const errorMessage = message as ScreenshotErrorResponse;
          const rejecter = pendingScreenshotRejecters.get(errorMessage.id);

          if (!rejecter) {
            logger.warn(`Received screenshot error for unknown or already handled session: ${errorMessage.id}`);
            break;
          }

          logger.error(`Server reported an error capturing screenshot for session ${errorMessage.id}:`, errorMessage.message);
          rejecter(new Error(errorMessage.message));
          pendingScreenshotResolvers.delete(errorMessage.id);
          pendingScreenshotRejecters.delete(errorMessage.id);
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

      const id = 'ts-client-' + Date.now();
      const screenshotRequest: ScreenshotRequest = {
        type: 'screenshot',
        id,
      };

      return new Promise<ScreenshotData>((resolve, reject) => {
        pendingScreenshotResolvers.set(id, resolve);
        pendingScreenshotRejecters.set(id, reject);

        logger.info('Sending screenshot request:', screenshotRequest);
        ws!.send(JSON.stringify(screenshotRequest), (err?: Error) => {
          if (err) {
            logger.error('Failed to send screenshot request:', err);
            pendingScreenshotResolvers.delete(id);
            pendingScreenshotRejecters.delete(id);
            reject(err);
          }
        });

        setTimeout(() => {
          if (pendingScreenshotResolvers.has(id)) {
            logger.error(`Screenshot request timed out for session ${id}`);
            pendingScreenshotRejecters.get(id)?.(new Error('Screenshot request timed out'));
            pendingScreenshotResolvers.delete(id);
            pendingScreenshotRejecters.delete(id);
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

    /**
     * Opens a WebSocket TCP proxy for the ADB port and connects the local adb
     * client to it.
     */
    const startAdbTunnel = async () => {
      const { port, cleanup } = await startTcpProxy(options.adbUrl, token);
      try {
        await new Promise<void>((resolve, reject) => {
          exec(`adb connect localhost:${port}`, (err) => {
            if (err) return reject(err);
            resolve();
          });
        });
        logger.info(`ADB connected on localhost:${port}`);
      } catch (err) {
        cleanup();
        throw err;
      }

      return { port, cleanup } as ProxyHandle;
    };
  });
}
