# Screenshot Example

This example shows how to take a screenshot of a [Limbar](https://limbar.io) instance
which may be Android emulator or iOS simulator.

It connects to the instance using `@limbar/api` package, requests a screenshot and writes it
to `/tmp/` folder.

## Quick Start

1. Rename `.env.example` to `.env` and update its `ORGANIZATION_ID` and `API_TOKEN` values which you can create in [Limbar Console](https://console.limbar.io).
1. Run.
   ```bash
   npm install
   npm run start
   ```
