# Screenshot Example

This example shows how to start an ADB tunnel for an Android instance on [Limbar](https://limbar.io)
so that `adb` daemon can recognize and connect to it.

It creates an instance using `@limbar/api` package and then starts the tunnel. Once the process
receives interrupt signal, it closes the connections and deletes the instance.

## Quick Start

1. Edit [`index.ts`](./index.ts) with your `organizationId` and `token` which you can create in Limbar Console.
1. Run.
   ```bash
   npm install
   npm run start
   ```
