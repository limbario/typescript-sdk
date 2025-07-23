import WebSocket from "modern-isomorphic-ws";

import { startTcpProxy } from "./proxy.js";
import type { ProxyHandle } from "./proxy.js";
export type { ProxyHandle } from "./proxy.js";

import { exec } from "node:child_process";

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
export type LogLevel = "none" | "error" | "warn" | "info" | "debug";

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
  type: "screenshot";
  id: string;
};

type ScreenshotResponse = {
  type: "screenshot";
  dataUri: string;
  id: string;
};

type ScreenshotData = {
  dataUri: string;
};

type ScreenshotErrorResponse = {
  type: "screenshotError";
  message: string;
  id: string;
};

type ServerMessage =
  | ScreenshotResponse
  | ScreenshotErrorResponse
  | { type: string; [key: string]: unknown };

/**
 * Creates a client for interacting with a Limbar instance
 * @param options Configuration options including webrtcUrl, token and log level
 * @returns An InstanceClient for controlling the instance
 */
export async function createInstanceClient(
  options: InstanceClientOptions,
): Promise<InstanceClient> {
  const token = options.token;
  const serverAddress = `${options.webrtcUrl}?token=${token}`;
  const logLevel = options.logLevel ?? "info";
  let ws: WebSocket | null = null;

  const screenshotRequests: Map<
    string,
    {
      resolver: (value: ScreenshotData | PromiseLike<ScreenshotData>) => void;
      rejecter: (reason?: any) => void;
    }
  > = new Map();
  // Logger functions
  const logger = {
    debug: (...args: any[]) => {
      if (logLevel === "debug") console.log(...args);
    },
    info: (...args: any[]) => {
      if (logLevel === "info" || logLevel === "debug") console.log(...args);
    },
    warn: (...args: any[]) => {
      if (logLevel === "warn" || logLevel === "info" || logLevel === "debug")
        console.warn(...args);
    },
    error: (...args: any[]) => {
      if (logLevel !== "none") console.error(...args);
    },
  };

  return new Promise<InstanceClient>((resolveConnection, rejectConnection) => {
    logger.debug(
      `Attempting to connect to WebSocket server at ${serverAddress}...`,
    );
    ws = new WebSocket(serverAddress);
    ws.on("message", (data: WebSocket.Data) => {
      let message: ServerMessage;
      try {
        message = JSON.parse(data.toString());
      } catch (e) {
        logger.error({ data, error: e }, "Failed to parse JSON message");
        return;
      }

      switch (message.type) {
        case "screenshot": {
          if (
            !("dataUri" in message) ||
            typeof message.dataUri !== "string" ||
            !("id" in message)
          ) {
            logger.warn("Received invalid screenshot message:", message);
            break;
          }

          const screenshotMessage = message as ScreenshotResponse;
          const request = screenshotRequests.get(screenshotMessage.id);

          if (!request) {
            logger.warn(
              `Received screenshot data for unknown or already handled session: ${screenshotMessage.id}`,
            );
            break;
          }

          logger.debug(
            `Received screenshot data URI for session ${screenshotMessage.id}.`,
          );
          request.resolver({ dataUri: screenshotMessage.dataUri });
          screenshotRequests.delete(screenshotMessage.id);
          break;
        }
        case "screenshotError": {
          if (!("message" in message) || !("id" in message)) {
            logger.warn("Received invalid screenshot error message:", message);
            break;
          }

          const errorMessage = message as ScreenshotErrorResponse;
          const request = screenshotRequests.get(errorMessage.id);

          if (!request) {
            logger.warn(
              `Received screenshot error for unknown or already handled session: ${errorMessage.id}`,
            );
            break;
          }

          logger.error(
            `Server reported an error capturing screenshot for session ${errorMessage.id}:`,
            errorMessage.message,
          );
          request.rejecter(new Error(errorMessage.message));
          screenshotRequests.delete(errorMessage.id);
          break;
        }
        default:
          logger.warn(`Received unexpected message type: ${message.type}`);
          break;
      }
    });

    ws.on("error", (err: Error) => {
      logger.error("WebSocket error:", err.message);
      if (
        ws &&
        (ws.readyState === WebSocket.CONNECTING ||
          ws.readyState === WebSocket.OPEN)
      ) {
        rejectConnection(err);
      }
      screenshotRequests.forEach((request) => request.rejecter(err));
    });

    ws.on("close", () => {
      logger.debug("Disconnected from server.");
      screenshotRequests.forEach((request) =>
        request.rejecter("Disconnected from server"),
      );
    });

    const screenshot = async (): Promise<ScreenshotData> => {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        return Promise.reject(
          new Error("WebSocket is not connected or connection is not open."),
        );
      }

      const id = "ts-client-" + Date.now();
      const screenshotRequest: ScreenshotRequest = {
        type: "screenshot",
        id,
      };

      return new Promise<ScreenshotData>((resolve, reject) => {
        logger.debug("Sending screenshot request:", screenshotRequest);
        ws!.send(JSON.stringify(screenshotRequest), (err?: Error) => {
          if (err) {
            logger.error("Failed to send screenshot request:", err);
            reject(err);
          }
        });

        const timeout = setTimeout(() => {
          if (screenshotRequests.has(id)) {
            logger.error(`Screenshot request timed out for session ${id}`);
            screenshotRequests
              .get(id)
              ?.rejecter(new Error("Screenshot request timed out"));
            screenshotRequests.delete(id);
          }
        }, 30000);
        screenshotRequests.set(id, {
          resolver: (value: ScreenshotData | PromiseLike<ScreenshotData>) => {
            clearTimeout(timeout);
            resolve(value);
            screenshotRequests.delete(id);
          },
          rejecter: (reason?: any) => {
            clearTimeout(timeout);
            reject(reason);
            screenshotRequests.delete(id);
          },
        });
      });
    };

    const disconnect = (): void => {
      if (ws) {
        logger.debug("Closing WebSocket connection.");
        ws.close();
      }
      screenshotRequests.forEach((request) =>
        request.rejecter("Websocket connection closed"),
      );
    };

    /**
     * Opens a WebSocket TCP proxy for the ADB port and connects the local adb
     * client to it.
     */
    const startAdbTunnel = async () => {
      const { port, close } = await startTcpProxy(options.adbUrl, token);
      try {
        await new Promise<void>((resolve, reject) => {
          exec(`adb connect localhost:${port}`, (err) => {
            if (err) return reject(err);
            resolve();
          });
        });
        logger.debug(`ADB connected on localhost:${port}`);
      } catch (err) {
        close();
        throw err;
      }

      return { port, close } as ProxyHandle;
    };
    ws.on("open", () => {
      logger.debug(`Connected to ${serverAddress}`);
      resolveConnection({
        screenshot,
        disconnect,
        startAdbTunnel,
      });
    });
  });
}
