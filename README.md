# @limbar/ui

UI components for embedding [Limbar](https://limbar.io) products such as remote control of
Android emulators in your web applications.
All components are built with React and written in TypeScript, exported as ES modules and
can be used in any modern JavaScript environment.

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

The URL of the instance and a token to authenticate the connection are required.
You can create a new instance programmatically using the Limbar API or manually in the
[Limbar Console](https://console.limbar.io). For the full API reference, see the
[Limbar API Reference](https://limbar.io/docs/api-reference).

Here is a quick example of instance creation using the Limbar API:

```bash
ORGANIZATION_ID=your-organization-id
LIMBAR_API_KEY=your-api-key
REGION=eu-north1
NAME=your-instance-name

curl -X PUT "https://$REGION.limbar.net/apis/android.limbar.io/v1alpha1/organizations/$ORGANIZATION_ID/instances?wait=true" \
  -H "Authorization: Bearer $LIMBAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"instance\": {\"metadata\": {\"name\": \"$NAME\", \"organizationId\": \"$ORGANIZATION_ID\"}}, \"wait\": true}"
```

The response will contain the instance's WebRTC URL:

```json
{
    "metadata": {
        "createdAt": "2024-12-05T12:49:01Z",
        "name": "<name>",
        "organizationId": "<org id>"
    },
    "status": {
        "connectionUrl": "https://eu-hel1-3-2585842.limbar.net/apis/android.limbar.io/v1alpha1/organizations/<org id>/instances/<name>/connect",
        "state": "ready",
        "webrtcUrl": "https://eu-hel1-3-2585842.limbar.net/apis/android.limbar.io/v1alpha1/organizations/<org id>/instances/<name>/webrtc"
    }
}
```

The `status.webrtcUrl` is the URL of the WebRTC endpoint and can be used to connect to the instance.

```jsx
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
