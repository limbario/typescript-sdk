import React, { useEffect, useRef, useState, useMemo } from 'react'
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

interface RemoteControlProps {
  // url is the URL of the instance to connect to.
  url: string;

  // token is used to authenticate the connection to the instance.
  token: string;

  // className is the class name to apply to the component
  // on top of the default styles.
  className?: string;

  // sessionId is a unique identifier for the WebRTC session
  // with the source to prevent conflicts between other
  // users connected to the same source.
  // If empty, the component will generate a random one.
  sessionId?: string;

  // openUrl is the URL to open in the instance when the
  // component is ready.
  //
  // If not provided, the component will not open any URL.
  openUrl?: string;
}

const CONTROL_MSG_TYPE = {
  INJECT_KEYCODE: 0,
  INJECT_TEXT: 1,
  INJECT_TOUCH_EVENT: 2,
  INJECT_SCROLL_EVENT: 3,
  BACK_OR_SCREEN_ON: 4,
  EXPAND_NOTIFICATION_PANEL: 5,
  EXPAND_SETTINGS_PANEL: 6,
  COLLAPSE_PANELS: 7,
  GET_CLIPBOARD: 8,
  SET_CLIPBOARD: 9,
  SET_DISPLAY_POWER: 10,
  ROTATE_DEVICE: 11,
} as const;

const AMOTION_EVENT = {
  ACTION_DOWN: 0,
  ACTION_UP: 1,
  ACTION_MOVE: 2,
  ACTION_CANCEL: 3,
  ACTION_POINTER_DOWN: 5,
  ACTION_POINTER_UP: 6,
  BUTTON_PRIMARY: 1,
  BUTTON_SECONDARY: 2,
  BUTTON_TERTIARY: 4,
} as const;

const ANDROID_KEYS = {
  ENTER: 66, // KEYCODE_ENTER
  DEL: 67,   // KEYCODE_DEL
  ACTION_DOWN: 0,
  ACTION_UP: 1,
  META_NONE: 0,
} as const;

export function RemoteControl({ className, url, token, sessionId: propSessionId, openUrl }: RemoteControlProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const keepAliveIntervalRef = useRef<number | undefined>(undefined);
  
  const sessionId = useMemo(() => 
    propSessionId || Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
    [propSessionId]
  );

  const updateStatus = (message: string) => {
    console.log(message);
  };

  const createTouchControlMessage = (
    action: number,
    pointerId: number,
    x: number,
    y: number,
    pressure = 1.0,
    actionButton = 0,
    buttons = 0
  ) => {
    if (!videoRef.current) return null;

    const buffer = new ArrayBuffer(32);
    const view = new DataView(buffer);
    let offset = 0;

    view.setUint8(offset, CONTROL_MSG_TYPE.INJECT_TOUCH_EVENT);
    offset += 1;

    view.setUint8(offset, action);
    offset += 1;

    view.setBigInt64(offset, BigInt(pointerId));
    offset += 8;

    view.setInt32(offset, Math.round(x), true);
    offset += 4;
    view.setInt32(offset, Math.round(y), true);
    offset += 4;
    view.setUint16(offset, videoRef.current.videoWidth, true);
    offset += 2;
    view.setUint16(offset, videoRef.current.videoHeight, true);
    offset += 2;

    view.setInt16(offset, Math.round(pressure * 0xffff), true);
    offset += 2;

    view.setInt32(offset, actionButton, true);
    offset += 4;

    view.setInt32(offset, buttons, true);
    return buffer;
  };

  const createInjectTextMessage = (text: string) => {
    const encoder = new TextEncoder();
    const textBytes = encoder.encode(text);
    
    const buffer = new ArrayBuffer(5 + textBytes.length);
    const view = new DataView(buffer);
    let offset = 0;

    view.setUint8(offset, CONTROL_MSG_TYPE.INJECT_TEXT);
    offset += 1;

    view.setUint32(offset, textBytes.length, false);
    offset += 4;

    new Uint8Array(buffer, offset).set(textBytes);

    return buffer;
  };

  const createSetClipboardMessage = (text: string, paste = true) => {
    const encoder = new TextEncoder();
    const textBytes = encoder.encode(text);
    
    // 1 byte for type + 8 bytes for sequence + 1 byte for paste flag + 4 bytes for length + text bytes
    const buffer = new ArrayBuffer(14 + textBytes.length);
    const view = new DataView(buffer);
    let offset = 0;

    view.setUint8(offset, CONTROL_MSG_TYPE.SET_CLIPBOARD);
    offset += 1;

    // Use 0 as sequence since we don't need an acknowledgement
    view.setBigInt64(offset, BigInt(0), false);
    offset += 8;

    // Set paste flag
    view.setUint8(offset, paste ? 1 : 0);
    offset += 1;

    // Text length
    view.setUint32(offset, textBytes.length, false);
    offset += 4;

    // Text data
    new Uint8Array(buffer, offset).set(textBytes);

    return buffer;
  };

  const createInjectKeycodeMessage = (
    action: number,
    keycode: number,
    repeat = 0,
    metaState = 0
  ) => {
    const buffer = new ArrayBuffer(14);
    const view = new DataView(buffer);
    let offset = 0;

    view.setUint8(offset, CONTROL_MSG_TYPE.INJECT_KEYCODE);
    offset += 1;

    view.setUint8(offset, action);
    offset += 1;

    view.setInt32(offset, keycode, true);
    offset += 4;

    view.setInt32(offset, repeat, true);
    offset += 4;

    view.setInt32(offset, metaState, true);
    return buffer;
  };

  const sendBinaryControlMessage = (data: ArrayBuffer) => {
    if (!dataChannelRef.current || dataChannelRef.current.readyState !== 'open') {
      return;
    }
    dataChannelRef.current.send(data);
  };

  const handleMouse = (event: React.MouseEvent | React.TouchEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (!dataChannelRef.current || dataChannelRef.current.readyState !== 'open' || !videoRef.current) {
      return;
    }

    const video = videoRef.current;
    const rect = video.getBoundingClientRect();

    // Get coordinates
    let clientX: number, clientY: number;
    if ('touches' in event) {
      // For touch events, always treat as a tap
      const touch = event.touches[0] || event.changedTouches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else if ('clientX' in event) {
      clientX = event.clientX;
      clientY = event.clientY;
    } else {
      return;
    }

    // Get the actual video dimensions
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    // Get the display dimensions
    const displayWidth = rect.width;
    const displayHeight = rect.height;

    // Calculate the video's position within its container
    const videoAspectRatio = videoWidth / videoHeight;
    const containerAspectRatio = displayWidth / displayHeight;

    // Calculate the actual dimensions of the video within the container
    let actualWidth = displayWidth;
    let actualHeight = displayHeight;
    if (videoAspectRatio > containerAspectRatio) {
      // Video is wider than container
      actualHeight = displayWidth / videoAspectRatio;
    } else {
      // Video is taller than container
      actualWidth = displayHeight * videoAspectRatio;
    }

    // Calculate the offset of the video within the container
    const offsetX = (displayWidth - actualWidth) / 2;
    const offsetY = (displayHeight - actualHeight) / 2;

    // Adjust coordinates relative to the video's actual position
    const relativeX = clientX - rect.left - offsetX;
    const relativeY = clientY - rect.top - offsetY;

    // Check if the click is within the actual video area
    if (
      relativeX < 0 ||
      relativeX > actualWidth ||
      relativeY < 0 ||
      relativeY > actualHeight
    ) {
      return;
    }

    // Calculate the coordinates in the video's coordinate space
    const x = (relativeX / actualWidth) * videoWidth;
    const y = (relativeY / actualHeight) * videoHeight;

    let action: number;
    if ('touches' in event) {
      // For touch events
      switch (event.type) {
        case 'touchstart':
          action = AMOTION_EVENT.ACTION_DOWN;
          break;
        case 'touchend':
          action = AMOTION_EVENT.ACTION_UP;
          break;
        case 'touchmove':
          action = AMOTION_EVENT.ACTION_MOVE;
          break;
        case 'touchcancel':
          action = AMOTION_EVENT.ACTION_CANCEL;
          break;
        default:
          return;
      }
    } else {
      // For mouse events
      switch (event.type) {
        case 'mousedown':
          action = AMOTION_EVENT.ACTION_DOWN;
          break;
        case 'mouseup':
          action = AMOTION_EVENT.ACTION_UP;
          break;
        case 'mousemove':
          action = AMOTION_EVENT.ACTION_MOVE;
          break;
        default:
          return;
      }
    }

    const message = createTouchControlMessage(
      action,
      -1,
      x,
      y,
      'touches' in event ? 1.0 : 1.0, // Use normal pressure for both touch and mouse
      AMOTION_EVENT.BUTTON_PRIMARY,
      AMOTION_EVENT.BUTTON_PRIMARY
    );

    if (message) {
      sendBinaryControlMessage(message);
    }
  };

  const handleKeyboard = (event: React.KeyboardEvent) => {
    console.log('Keyboard event:', {
      type: event.type,
      key: event.key,
      keyCode: event.keyCode,
      code: event.code,
      target: (event.target as HTMLElement).tagName,
      focused: document.activeElement === videoRef.current,
    });

    if (document.activeElement !== videoRef.current) {
      console.warn('Video element not focused');
      return;
    }

    if (!dataChannelRef.current || dataChannelRef.current.readyState !== 'open') {
      console.warn('Data channel not ready for keyboard event:', dataChannelRef.current?.readyState);
      return;
    }

    // Handle paste shortcut (Cmd+V on macOS, Ctrl+V on Windows/Linux)
    if (event.type === 'keydown' && event.key.toLowerCase() === 'v' && (event.metaKey || event.ctrlKey)) {
      console.log('Paste shortcut detected');
      
      // Use the clipboard API to get text
      navigator.clipboard.readText().then(text => {
        if (text) {
          console.log('Pasting text from clipboard API:', text.substring(0, 20) + (text.length > 20 ? '...' : ''));
          const message = createSetClipboardMessage(text, true);
          sendBinaryControlMessage(message);
        }
      }).catch(err => {
        console.error('Failed to read clipboard contents: ', err);
      });
      
      event.preventDefault();
      return;
    }

    if (event.type !== 'keydown') {
      return;
    }

    if (event.key.length === 1) {
      const message = createInjectTextMessage(event.key);
      sendBinaryControlMessage(message);
      event.preventDefault();
    } else if (event.key === 'Enter' || event.key === 'Backspace') {
      const keycode = event.key === 'Enter' ? ANDROID_KEYS.ENTER : ANDROID_KEYS.DEL;
      
      // Send key down
      const messageDown = createInjectKeycodeMessage(
        ANDROID_KEYS.ACTION_DOWN,
        keycode,
        0,
        ANDROID_KEYS.META_NONE
      );
      sendBinaryControlMessage(messageDown);

      // Send key up
      const messageUp = createInjectKeycodeMessage(
        ANDROID_KEYS.ACTION_UP,
        keycode,
        0,
        ANDROID_KEYS.META_NONE
      );
      sendBinaryControlMessage(messageUp);
      event.preventDefault();
    }
  };

  const sendKeepAlive = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'keepAlive',
        sessionId: sessionId
      }));
    }
  };

  const startKeepAlive = () => {
    if (keepAliveIntervalRef.current) {
      window.clearInterval(keepAliveIntervalRef.current);
    }
    keepAliveIntervalRef.current = window.setInterval(sendKeepAlive, 10000);
  };

  const stopKeepAlive = () => {
    if (keepAliveIntervalRef.current) {
      window.clearInterval(keepAliveIntervalRef.current);
      keepAliveIntervalRef.current = undefined;
    }
  };

  const handleVisibilityChange = () => {
    if (document.hidden) {
      stopKeepAlive();
    } else {
      startKeepAlive();
    }
  };

  const start = async () => {
    try {
      wsRef.current = new WebSocket(`${url}?token=${token}`);
      
      wsRef.current.onerror = (error) => {
        updateStatus('WebSocket error: ' + error);
      };

      wsRef.current.onclose = () => {
        updateStatus('WebSocket closed');
      };

      // Wait for WebSocket to connect
      await new Promise((resolve, reject) => {
        if (wsRef.current) {
          wsRef.current.onopen = resolve;
          setTimeout(() => reject(new Error('WebSocket connection timeout')), 5000);
        }
      });

      // Request RTCConfiguration
      const rtcConfigPromise = new Promise<RTCConfiguration>((resolve, reject) => {
        const timeoutId = setTimeout(() => reject(new Error('RTCConfiguration timeout')), 5000);
        
        const messageHandler = (event: MessageEvent) => {
          try {
            const message = JSON.parse(event.data);
            if (message.type === 'rtcConfiguration') {
              clearTimeout(timeoutId);
              wsRef.current?.removeEventListener('message', messageHandler);
              resolve(message.rtcConfiguration);
            }
          } catch (e) {
            console.error('Error handling RTC configuration:', e);
            reject(e);
          }
        };

        wsRef.current?.addEventListener('message', messageHandler);
        wsRef.current?.send(JSON.stringify({
          type: 'requestRtcConfiguration',
          sessionId: sessionId
        }));
      });

      const rtcConfig = await rtcConfigPromise;

      // Create peer connection with received configuration
      peerConnectionRef.current = new RTCPeerConnection(rtcConfig);
      peerConnectionRef.current.addTransceiver('audio', { direction: 'recvonly' });
      
      // Add transceivers for video and audio with H.264 preference
      const videoTransceiver = peerConnectionRef.current.addTransceiver('video', { direction: 'recvonly' });
      // Set codec preferences to prefer H.264
      const supportedCodecs = RTCRtpReceiver.getCapabilities("video")?.codecs;
      if (supportedCodecs) {
        // Sort codecs to prefer H.264
        const sortedCodecs = [...supportedCodecs].sort((a, b) => {
          if (a.mimeType.toLowerCase().includes('h264')) return -1;
          if (b.mimeType.toLowerCase().includes('h264')) return 1;
          return 0;
        });
        
        try {
          videoTransceiver.setCodecPreferences(sortedCodecs);
          console.log('Codec preferences set:', sortedCodecs);
        } catch (e) {
          console.warn('Failed to set codec preferences:', e);
        }
      }


      // Create data channel
      dataChannelRef.current = peerConnectionRef.current.createDataChannel("control", {
        ordered: true,
        negotiated: true,
        id: 1
      });
      
      dataChannelRef.current.onopen = () => {
        updateStatus('Control channel opened');
        // Request first frame once we're ready to receive video
        if (wsRef.current) {
          wsRef.current.send(JSON.stringify({ type: 'requestFrame', sessionId: sessionId }));
          
          // Send openUrl message if the prop is provided
          if (openUrl) {
            try {
              const decodedUrl = decodeURIComponent(openUrl);
              updateStatus('Opening URL');
              wsRef.current.send(JSON.stringify({
                type: 'openUrl',
                url: decodedUrl,
                sessionId: sessionId
              }));
            } catch (error) {
              console.error({error}, 'Error decoding URL, falling back to the original URL');
              wsRef.current.send(JSON.stringify({
                type: 'openUrl',
                url: openUrl,
                sessionId: sessionId
              }));
            }
          }
        }
      };
      
      dataChannelRef.current.onclose = () => {
        updateStatus('Control channel closed');
      };

      dataChannelRef.current.onerror = (error) => {
        console.error('Control channel error:', error);
        updateStatus('Control channel error: ' + error);
      };

      // Set up connection state monitoring
      peerConnectionRef.current.onconnectionstatechange = () => {
        updateStatus('Connection state: ' + peerConnectionRef.current?.connectionState);
        setIsConnected(peerConnectionRef.current?.connectionState === 'connected');
      };

      peerConnectionRef.current.oniceconnectionstatechange = () => {
        updateStatus('ICE state: ' + peerConnectionRef.current?.iceConnectionState);
      };

      // Set up video handling
      peerConnectionRef.current.ontrack = (event) => {
        updateStatus('Received remote track: ' + event.track.kind);
        if (event.track.kind === 'video' && videoRef.current) {
          console.log(`[${new Date().toISOString()}] Video track received:`, event.track);
          videoRef.current.srcObject = event.streams[0];
        }
      };

      // Handle ICE candidates
      peerConnectionRef.current.onicecandidate = (event) => {
        if (event.candidate && wsRef.current) {
          const message = {
            type: 'candidate',
            candidate: event.candidate.candidate,
            sdpMid: event.candidate.sdpMid,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
            sessionId: sessionId
          };
          wsRef.current.send(JSON.stringify(message));
          updateStatus('Sent ICE candidate');
        } else {
          updateStatus('ICE candidate gathering completed');
        }
      };

      // Handle incoming messages
      wsRef.current.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data);
          updateStatus('Received: ' + message.type);

          if (message.type === 'answer' && peerConnectionRef.current) {
            await peerConnectionRef.current.setRemoteDescription(
              new RTCSessionDescription({
                type: 'answer',
                sdp: message.sdp
              })
            );
            updateStatus('Set remote description');
          } else if (message.type === 'candidate' && peerConnectionRef.current) {
            await peerConnectionRef.current.addIceCandidate(
              new RTCIceCandidate({
                candidate: message.candidate,
                sdpMid: message.sdpMid,
                sdpMLineIndex: message.sdpMLineIndex
              })
            );
            updateStatus('Added ICE candidate');
          }
        } catch (e) {
          updateStatus('Error handling message: ' + e);
        }
      };

      // Create and send offer
      if (peerConnectionRef.current) {
        const offer = await peerConnectionRef.current.createOffer({
          offerToReceiveVideo: true,
          offerToReceiveAudio: false
        });
        await peerConnectionRef.current.setLocalDescription(offer);
        
        if (wsRef.current) {
          wsRef.current.send(JSON.stringify({
            type: 'offer',
            sdp: offer.sdp,
            sessionId: sessionId
          }));
        }
        updateStatus('Sent offer');
      }
    } catch (e) {
      updateStatus('Error: ' + e);
    }
  };

  const stop = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }
    setIsConnected(false);
    updateStatus('Stopped');
  };

  useEffect(() => {
    // Start connection when component mounts
    start();

    // Only start keepAlive if page is visible
    if (!document.hidden) {
      startKeepAlive();
    }

    // Add visibility change listener
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Clean up
    return () => {
      stopKeepAlive();
      stop();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [url, token, propSessionId]);

  const handleVideoClick = () => {
    if (videoRef.current) {
      videoRef.current.focus();
    }
  };

  return (
    <div 
      className={twMerge(clsx("relative flex h-full items-center justify-center bg-muted/90", className))}
      onTouchStart={handleMouse}
      onTouchMove={handleMouse}
      onTouchEnd={handleMouse}
      onTouchCancel={handleMouse}
      style={{ touchAction: 'none' }}
    >
      <video
        ref={videoRef}
        className="max-h-full h-full max-w-full object-contain"
        autoPlay
        playsInline
        tabIndex={0}
        style={{outline: 'none', touchAction: 'none'}}
        onMouseDown={handleMouse}
        onMouseMove={handleMouse}
        onMouseUp={handleMouse}
        onKeyDown={handleKeyboard}
        onClick={handleVideoClick}
        onFocus={() => {
          if (videoRef.current) {
            videoRef.current.style.outline = '2px solid blue';
          }
        }}
        onBlur={() => {
          if (videoRef.current) {
            videoRef.current.style.outline = 'none';
          }
        }}
      />
      {!isConnected && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Connecting...</p>
          </div>
        </div>
      )}
    </div>
  );
} 