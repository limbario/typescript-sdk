# @limbar/ui

This package contains all the UI components that you can use to serve
Android emulators and iOS simulators from [Limbar](https://limbar.io)
to your users over WebRTC, such as `RemoteControl` which is a React
component written in TypeScript.

## Get Started

For full example with both backend and frontend, see
[`examples/simple`](../../examples/simple)

Add the dependency to your frontend package.
```bash
npm install @limbar/ui
```

It's recommended that you trigger creation over a backend endpoint of
yours that will call Limbar with an organization token. Making the
call from browser to Limbar directly risks leaking your organization token.

Here is an example:

```tsx
import { RemoteControl } from '@limbar/ui';

function MyRemoteControl() {
  return (
    <RemoteControl 
      url="https://your-webrtc-url" 
      token="your-auth-token"
    />
  );
}
```

To get the WebRTC URL and token, you can add an endpoint to your backend
that calls [Limbar](https://limbar.io) using our type-safe client package
[`@limbar/api`](../api) or you can make the HTTP calls directly according to our
[API Reference](https://limbar.io/docs/api-reference).

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

#### Props

| Prop | Type | Description |
|------|------|-------------|
| `url` | string | The URL of the instance to connect to |
| `token` | string | Token used to authenticate the connection to the instance |
| `className` | string? | Optional class name to apply to the component on top of the default styles |
| `sessionId` | string? | Optional unique identifier for the WebRTC session to prevent conflicts between users connected to the same source. If not provided, a random one will be generated |
| `openUrl` | string? | Optional URL to open in the instance when the component is ready, such as an Expo URL |
