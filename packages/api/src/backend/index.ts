import type * as Oazapfts from "@oazapfts/runtime";
import * as Generated from "./zz_client.js";
import { putAndUploadAsset } from "./helpers.js";

// Re-export ALL types from the generated file, but none of the values.
export type * from "./zz_client.js";

/**
 * Configuration options for creating a Backend API client instance.
 */
export interface BackendClientOptions {
  baseUrl: string;
  token: string;
  requestOpts?: Oazapfts.RequestOpts;
}

// Helper type: Extracts the parameters of a function, excluding the last 'opts' argument.
type ExcludeOpts<T extends (...args: any) => any> = T extends (
  ...args: [...infer P, Oazapfts.RequestOpts?]
) => any
  ? P
  : never;

// Helper type: Defines the structure of the client instance returned by the factory.
// It maps the generated *functions* to methods with the same parameters (minus 'opts').
export type BackendClient = {
  // Iterate over keys of the generated module
  [K in keyof typeof Generated as (typeof Generated)[K] extends (
    // Only include keys whose values are functions
    ...args: any
  ) => any
    ? K
    : never]: (typeof Generated)[K] extends (...args: any) => any // If the value is a function, define its signature in the client type
    ? (
        ...args: ExcludeOpts<(typeof Generated)[K]>
      ) => ReturnType<(typeof Generated)[K]>
    : never; // Should not happen due to the filter above, but satisfies TS
} & {
  putAndUploadAsset: (
    organizationId: string,
    filePath: string,
  ) => Promise<Generated.AssetPutResult>;
};

/**
 * Creates a new Backend API client instance with its own configuration.
 * @param options Configuration for this client instance (baseUrl, headers, etc.).
 * @returns An object containing methods to interact with the Backend API.
 */
export function createBackendClient(options: BackendClientOptions): BackendClient {
  const baseOpts: Oazapfts.RequestOpts = {
    baseUrl: options.baseUrl,
    headers: {
      Authorization: `Bearer ${options.token}`,
    },
    ...options.requestOpts,
  };
  const client: Partial<BackendClient> = {};

  // Iterate over keys and check if the value is a function before creating the wrapper
  for (const key in Generated) {
    const potentialFunc = Generated[key as keyof typeof Generated];
    if (typeof potentialFunc === "function") {
      // Now we know it's a function, proceed with wrapping
      const funcName = key as keyof BackendClient;
      const originalFunc = potentialFunc as (...args: any[]) => any;

      client[funcName] = (...args: any[]) => {
        // Call the original generated function, injecting baseOpts as the last argument
        // Ensure we handle cases where the original function might not expect opts
        // Although oazapfts generated functions usually do
        return originalFunc(...args, baseOpts);
      };
    }
  }
  client.putAndUploadAsset = (organizationId: string, filePath: string) => {
    return putAndUploadAsset(organizationId, filePath, baseOpts);
  };
  return client as BackendClient;
}
