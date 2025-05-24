import React, { useRef, useMemo } from 'react';
import {
  RemoteControl,
  RemoteControlHandle,
  RemoteControlProps,
  ImperativeKeyboardEvent,
  ScreenshotData,
} from '../components/remote-control';

/**
 * Convenience hook that mounts the <RemoteControl/> component and returns
 * imperative helpers so callers do not have to juggle React refs manually.
 *
 * Example:
 * const {
 *   Component: Remote,     // JSX element you can render anywhere
 *   openUrl,               // helper
 *   screenshot,
 *   sendKeyEvent,
 * } = useRemoteControl({ url, token });
 *
 * return (<>
 *   <Remote className="h-full w-full" />
 *   <button onClick={() => openUrl('https://example.com')}>Open</button>
 * </>);
 */
export function useRemoteControl(props: RemoteControlProps) {
  const ref = useRef<RemoteControlHandle>(null);

  // Memoise the component so we do not recreate it on every render.
  const Component = useMemo(() => {
    // eslint-disable-next-line react/jsx-props-no-spreading
    return <RemoteControl ref={ref} {...props} />;
    // We intentionally only include primitive fields that are expected to
    // change and require a re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.url, props.token, props.sessionId, props.openUrl]);

  return {
    Component,
    openUrl: (url: string) => ref.current?.openUrl(url),
    screenshot: (): Promise<ScreenshotData> => {
      if (!ref.current) throw new Error('RemoteControl is not mounted yet');
      return ref.current.screenshot();
    },
    sendKeyEvent: (ev: ImperativeKeyboardEvent) => ref.current?.sendKeyEvent(ev),
  } as const;
}