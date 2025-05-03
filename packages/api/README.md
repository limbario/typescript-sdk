# @limbar/api

This package contains a fully-typed HTTP clients to communicate with Limbar services,
specifically region endpoints and main Limbar API with following features:
* Types are generated from OpenAPI spec and kept up-to-date,
* Minimal dependencies so that it can be used in all JavaScript environments,
* Based on `fetch` for performance and exposing all the `fetch` options in a typed manner.
* Generated TypeScript schema is exported so you can use any client wrapper you like.

## Get Started

See a full example with frontend and backend in [`examples/simple`](../../examples/simple).

Here is an example API call made to `eu-north1` region using this client.

```ts
const apiToken = process.env.API_TOKEN;
const organizationId = process.env.ORGANIZATION_ID;
const region = process.env.REGION;

if (!apiToken || !organizationId || !region) {
  console.error("Error: Missing required environment variables (API_TOKEN, ORGANIZATION_ID, REGION).");
  process.exit(1);
}

const regionClient = createRegionClient({
  baseUrl: `https://${region}.limbar.net`,
  token: apiToken,
});

const result = await regionClient.putAndroidInstance(organizationId, {
  instance: {
    metadata: {
      name: name,
      organizationId: organizationId,
    }
  },
  wait: true
});

if (result.status !== 200) {
    const errorMessage = result.data?.message || `API returned status ${result.status}`;
    console.error(`API Error (${result.status}): ${errorMessage}`);
    process.exit(1)
}
console.log({
    name,
    webrtcUrl: result.data.status.webrtcUrl,
    token: result.data.token,
}, "Success! You can deliver token and webrtcUrl to your frontend!")
```
