# Limbar TypeScript SDK

This repo contains TypeScript SDK package to integrate
[Limbar](https://limbar.io) products into your applications.

It has multiple packages:
* [`@limbar/api`](packages/api): A TypeScript package that
  lets you call [Limbar](https://limbar.io) APIs with full
  type safety.
* [`@limbar/ui`](packages/ui): Set of React components
  written in TypeScript that lets you mount the Limbar
  instances on your web app, such as Android emulators and
  iOS simulators.

# Get Started

## Embed an Android emulator in your web application

See a full example of how to embed an Android emulator in your web application in the
[examples/simple](./examples/simple) directory.

## Releasing

To release a new version, follow these steps:

1. Bump the version in `package.json` of the respective package and run `npm install`.
1. Push the changes to the repository.
1. Create a new release on GitHub with name and version, such as `api@v0.1.0`
1. Run the following commands:

   ```bash
   export NPM_TOKEN=<npm token to publish>
   cd packages/<package to publish>
   npm run build
   npm publish
   ```

## License

MIT
