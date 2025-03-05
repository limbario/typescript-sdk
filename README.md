# @limbar/ui

UI components for embedding Limbar products such as remote control of Android emulators in your applications.
All components are built with React and written in TypeScript, exported as ES modules and can be used in any modern
JavaScript environment.

## Installation

```bash
npm install @limbar/ui
```

## Components

### RemoteControl

The `RemoteControl` component allows you to stream the screen of an Android emulator to your application as well as control it
with your mouse and keyboard.

Some of the features include:

* Multiple users can connect to the same instance simultaneously which is super useful for
  demos and presentations.
  * You can build and deploy your app in a cloud editor that has `lim connect android` running and see your app
    in the browser.
* The component is optimized for low latency and high performance by using WebRTC as the transport layer for both video
  and the control signals.

#### Usage

```jsx
import { RemoteControl } from '@limbar/ui';

function MyRemoteControl() {
  return (
    <RemoteControl 
      url="https://your-connection-url" 
      token="your-auth-token"
    />
  );
}
```

#### Props

| Prop | Type | Description |
|------|------|-------------|
| `url` | string | The URL of the instance to connect to |
| `token` | string | Token used to authenticate the connection to the instance |
| `className` | string? | Optional class name to apply to the component on top of the default styles |
| `sessionId` | string? | Optional unique identifier for the WebRTC session to prevent conflicts between users connected to the same source. If not provided, a random one will be generated |
| `openUrl` | string? | Optional URL to open in the instance when the component is ready, such as an Expo URL |

## Contributing

To get the demo working, edit `src/demo.tsx` to use your own instance URL and token.

```bash
npm install
npm run dev
```

### Releasing

To release a new version, follow these steps:

1. Bump the version in `package.json` and run `npm install`.
1. Push the changes to the repository.
1. Create a new release on GitHub with the same name as the new version.
1. Run the following commands:

   ```bash
   npm run build
   npm publish
   ```

## License

MIT
