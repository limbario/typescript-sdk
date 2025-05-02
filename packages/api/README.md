# @limbar/api

This package contains a fully-typed HTTP clients to communicate with Limbar services,
specifically region endpoints and main Limbar API with following features:
* Types are generated from OpenAPI spec and kept up-to-date,
* Minimal dependencies so that it can be used in all JavaScript environments,
* Based on `fetch` for performance and exposing all the `fetch` options in a typed manner.
* Generated TypeScript schema is exported so you can use any client wrapper you like.

## Get Started

Here is an example API call made to `eu-north1` region using this client.

```ts
import { createRegionClient, type RegionClientOptions } from '@limbar/api';

const options: RegionClientOptions = {
  baseUrl: 'https://your-api.example.com',
  headers: {
    Authorization: `Bearer YOUR_API_TOKEN`,
  },
};

const regionClient = createRegionClient(options);

async function listReadyInstances(organizationId: string) {
  const { data, error, response } = await regionClient.GET("/apis/android.limbar.io/v1alpha1/organizations/{organizationId}/instances", {
    params: {
      path: { organizationId },
      query: { state: 'ready' } // Optional: Filter by state
    }
  });

  if (error) {
    console.error(`API Error (${response.status}):`, error);
    throw error; // Or handle the error appropriately
  }

  // data is fully typed based on your OpenAPI schema
  console.log('Ready Instances:', data);
  return data; // data type: components["schemas"]["AndroidInstance"][] | undefined
}

listReadyInstances('your-org-id')
  .catch(err => {
    console.error("Failed to list instances:", err);
  });
```