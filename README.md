# @limbar/ui

UI components for Limbar applications.

## Installation

```bash
npm install @limbar/ui
```

## Components

### RemoteControl

The `RemoteControl` component allows you to interact with a remote device via WebRTC.

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

## License

MIT
