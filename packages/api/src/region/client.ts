import createClient, { type FetchOptions } from "openapi-fetch";
import type { paths, components } from "./zz_schema.js";

export interface RegionClientOptions extends FetchOptions<paths> {}

/**
 * Creates a new Region API client.
 * @param options Options for the openapi-fetch client, including `baseUrl`.
 * @returns A typed Region API client instance.
 */
export function createRegionClient(options: RegionClientOptions) {
  const client = createClient<paths>(options);
  return client;
}

export type { paths as RegionApiPaths };
export type { components as RegionApiComponents };
