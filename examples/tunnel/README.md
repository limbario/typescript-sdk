# ADB Tunnel Example

This example shows how to start an ADB tunnel for an Android instance on [Limbar](https://limbar.io)
so that `adb` daemon can recognize and connect to it.

It creates an instance using `@limbar/api` package and then starts the tunnel. Once the process
receives interrupt signal, it closes the connections and deletes the instance.

## Quick Start

1. Rename `.env.example` to `.env` and update its `ORGANIZATION_ID` and `API_TOKEN` values which you can create in [Limbar Console](https://console.limbar.io).
1. Run.
   ```bash
   npm install
   npm run start
   ```
1. See it in `adb`
   ```bash
   adb devices
   ```
