# @limbar/api

Create Android emulators or iOS simulators as if you're calling your own internal functions.

This package contains a fully-typed HTTP client to communicate with Limbar services,
specifically region endpoints and main Limbar API with following features:
* Types are generated from OpenAPI spec and kept up-to-date,
* Minimal dependencies so that it can be used in all JavaScript environments,
* Based on `fetch` for performance and exposing all the `fetch` options in a typed manner,
* [OpenAPI spec](openapi/region.yaml) is published so you can generate your own clients too.

## Get Started

See a full example with frontend and backend in [`examples/simple`](../../examples/simple).

Add the dependency:
```bash
npm install @limbar/api
```

Here is an example API call made to `eu-north1` region using this client.

```ts
import { createRegionClient } from "@limbar/api";

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
const name = `api-example-${Math.random().toString(36).substring(2, 9)}`;
const result = await regionClient.putAndroidInstance(organizationId, {
  instance: {
    metadata: { name }
  },
  wait: true
});

if (result.status !== 200) {
    console.error(`API Error (${result.status}): ${result.data.message}`);
    process.exit(1)
}
console.log({
    name,
    webrtcUrl: result.data.status.webrtcUrl,
    token: result.data.token,
}, "Success! You can deliver the token and webrtcUrl to RemoteControl component from @limbar/ui in your frontend!");
```

## Region Client

It is used to communicate with a given region, such as `eu-north1`, to manage instances and their tokens as shown above.

It's effectively a wrapper around code generated from [Limbar OpenAPI](./openapi/region.yaml).
See the code in [index.ts](./src/region/index.ts).

## Instance Client

It is used to communicate directly with an instance in server environment, regardless of whether it's
Android emulator or iOS simulator. For example, you can request a screenshot of a running instance at any time.

It's based on standard WebSocket messages.
See the code in [index.ts](./src/instance/index.ts).
