import React, { useEffect, useRef, useState, useMemo, forwardRef, useImperativeHandle } from 'react'

declare global {
  interface Window {
    debugRemoteControl?: boolean;
  }
}

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

interface ScreenshotData {
  dataUri: string;
}

export interface ImperativeKeyboardEvent {
  type: 'keydown' | 'keyup';
  code: string; // e.g., "KeyA", "Enter", "ShiftLeft"
  shiftKey?: boolean;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
}

export interface RemoteControlHandle {
  openUrl: (url: string) => void;
  sendKeyEvent: (event: ImperativeKeyboardEvent) => void;
  screenshot: () => Promise<ScreenshotData>;
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
  // Actions
  ACTION_DOWN: 0,
  ACTION_UP: 1,

  // Meta state flags (from android.view.KeyEvent)
  META_NONE: 0,
  META_SHIFT_ON: 1,
  META_ALT_ON: 2,
  META_CTRL_ON: 4096, // META_CTRL_LEFT_ON | META_CTRL_RIGHT_ON
  META_META_ON: 65536, // META_META_LEFT_ON | META_META_RIGHT_ON

  // Keycodes (from android.view.KeyEvent)
  KEYCODE_UNKNOWN: 0,
  KEYCODE_SOFT_LEFT: 1,
  KEYCODE_SOFT_RIGHT: 2,
  KEYCODE_HOME: 3,
  KEYCODE_BACK: 4,
  KEYCODE_CALL: 5,
  KEYCODE_ENDCALL: 6,
  KEYCODE_0: 7,
  KEYCODE_1: 8,
  KEYCODE_2: 9,
  KEYCODE_3: 10,
  KEYCODE_4: 11,
  KEYCODE_5: 12,
  KEYCODE_6: 13,
  KEYCODE_7: 14,
  KEYCODE_8: 15,
  KEYCODE_9: 16,
  KEYCODE_STAR: 17,
  KEYCODE_POUND: 18,
  DPAD_UP: 19,    // KEYCODE_DPAD_UP
  DPAD_DOWN: 20,  // KEYCODE_DPAD_DOWN
  DPAD_LEFT: 21,  // KEYCODE_DPAD_LEFT
  DPAD_RIGHT: 22, // KEYCODE_DPAD_RIGHT
  KEYCODE_DPAD_CENTER: 23,
  KEYCODE_VOLUME_UP: 24,
  KEYCODE_VOLUME_DOWN: 25,
  KEYCODE_POWER: 26,
  KEYCODE_CAMERA: 27,
  KEYCODE_CLEAR: 28,
  KEYCODE_A: 29,
  KEYCODE_B: 30,
  KEYCODE_C: 31,
  KEYCODE_D: 32,
  KEYCODE_E: 33,
  KEYCODE_F: 34,
  KEYCODE_G: 35,
  KEYCODE_H: 36,
  KEYCODE_I: 37,
  KEYCODE_J: 38,
  KEYCODE_K: 39,
  KEYCODE_L: 40,
  KEYCODE_M: 41,
  KEYCODE_N: 42,
  KEYCODE_O: 43,
  KEYCODE_P: 44,
  KEYCODE_Q: 45,
  KEYCODE_R: 46,
  KEYCODE_S: 47,
  KEYCODE_T: 48,
  KEYCODE_U: 49,
  KEYCODE_V: 50,
  KEYCODE_W: 51,
  KEYCODE_X: 52,
  KEYCODE_Y: 53,
  KEYCODE_Z: 54,
  KEYCODE_COMMA: 55,
  KEYCODE_PERIOD: 56,
  KEYCODE_ALT_LEFT: 57,
  KEYCODE_ALT_RIGHT: 58,
  KEYCODE_SHIFT_LEFT: 59,
  KEYCODE_SHIFT_RIGHT: 60,
  KEYCODE_TAB: 61,
  KEYCODE_SPACE: 62,
  KEYCODE_SYM: 63,
  KEYCODE_EXPLORER: 64,
  KEYCODE_ENVELOPE: 65,
  ENTER: 66, // KEYCODE_ENTER
  DEL: 67,   // KEYCODE_DEL (Backspace)
  KEYCODE_GRAVE: 68, // `
  KEYCODE_MINUS: 69, // -
  KEYCODE_EQUALS: 70, // =
  KEYCODE_LEFT_BRACKET: 71, // [
  KEYCODE_RIGHT_BRACKET: 72, // ]
  KEYCODE_BACKSLASH: 73, // \
  KEYCODE_SEMICOLON: 74, // ;
  KEYCODE_APOSTROPHE: 75, // '
  KEYCODE_SLASH: 76, // /
  KEYCODE_AT: 77, // @
  KEYCODE_NUM: 78,
  KEYCODE_HEADSETHOOK: 79,
  KEYCODE_FOCUS: 80,
  KEYCODE_PLUS: 81,
  MENU: 82,  // KEYCODE_MENU
  KEYCODE_NOTIFICATION: 83,
  KEYCODE_SEARCH: 84,
  KEYCODE_MEDIA_PLAY_PAUSE: 85,
  KEYCODE_MEDIA_STOP: 86,
  KEYCODE_MEDIA_NEXT: 87,
  KEYCODE_MEDIA_PREVIOUS: 88,
  KEYCODE_MEDIA_REWIND: 89,
  KEYCODE_MEDIA_FAST_FORWARD: 90,
  KEYCODE_MUTE: 91,
  KEYCODE_PAGE_UP: 92,
  KEYCODE_PAGE_DOWN: 93,
  KEYCODE_PICTSYMBOLS: 94,
  KEYCODE_SWITCH_CHARSET: 95,
  KEYCODE_BUTTON_A: 96,
  KEYCODE_BUTTON_B: 97,
  KEYCODE_BUTTON_C: 98,
  KEYCODE_BUTTON_X: 99,
  KEYCODE_BUTTON_Y: 100,
  KEYCODE_BUTTON_Z: 101,
  KEYCODE_BUTTON_L1: 102,
  KEYCODE_BUTTON_R1: 103,
  KEYCODE_BUTTON_L2: 104,
  KEYCODE_BUTTON_R2: 105,
  KEYCODE_BUTTON_THUMBL: 106,
  KEYCODE_BUTTON_THUMBR: 107,
  KEYCODE_BUTTON_START: 108,
  KEYCODE_BUTTON_SELECT: 109,
  KEYCODE_BUTTON_MODE: 110,
  KEYCODE_ESCAPE: 111,
  FORWARD_DEL: 112, // KEYCODE_FORWARD_DEL (Delete key)
  KEYCODE_CTRL_LEFT: 113,
  KEYCODE_CTRL_RIGHT: 114,
  KEYCODE_CAPS_LOCK: 115,
  KEYCODE_SCROLL_LOCK: 116,
  KEYCODE_META_LEFT: 117,
  KEYCODE_META_RIGHT: 118,
  KEYCODE_FUNCTION: 119,
  KEYCODE_SYSRQ: 120,
  KEYCODE_BREAK: 121,
  KEYCODE_MOVE_HOME: 122,
  KEYCODE_MOVE_END: 123,
  KEYCODE_INSERT: 124,
  KEYCODE_FORWARD: 125,
  KEYCODE_MEDIA_PLAY: 126,
  KEYCODE_MEDIA_PAUSE: 127,
  KEYCODE_MEDIA_CLOSE: 128,
  KEYCODE_MEDIA_EJECT: 129,
  KEYCODE_MEDIA_RECORD: 130,
  KEYCODE_F1: 131,
  KEYCODE_F2: 132,
  KEYCODE_F3: 133,
  KEYCODE_F4: 134,
  KEYCODE_F5: 135,
  KEYCODE_F6: 136,
  KEYCODE_F7: 137,
  KEYCODE_F8: 138,
  KEYCODE_F9: 139,
  KEYCODE_F10: 140,
  KEYCODE_F11: 141,
  KEYCODE_F12: 142,
  KEYCODE_NUM_LOCK: 143,
  KEYCODE_NUMPAD_0: 144,
  KEYCODE_NUMPAD_1: 145,
  KEYCODE_NUMPAD_2: 146,
  KEYCODE_NUMPAD_3: 147,
  KEYCODE_NUMPAD_4: 148,
  KEYCODE_NUMPAD_5: 149,
  KEYCODE_NUMPAD_6: 150,
  KEYCODE_NUMPAD_7: 151,
  KEYCODE_NUMPAD_8: 152,
  KEYCODE_NUMPAD_9: 153,
  KEYCODE_NUMPAD_DIVIDE: 154,
  KEYCODE_NUMPAD_MULTIPLY: 155,
  KEYCODE_NUMPAD_SUBTRACT: 156,
  KEYCODE_NUMPAD_ADD: 157,
  KEYCODE_NUMPAD_DOT: 158,
  KEYCODE_NUMPAD_COMMA: 159,
  KEYCODE_NUMPAD_ENTER: 160,
  KEYCODE_NUMPAD_EQUALS: 161,
  KEYCODE_NUMPAD_LEFT_PAREN: 162,
  KEYCODE_NUMPAD_RIGHT_PAREN: 163,
  KEYCODE_VOLUME_MUTE: 164,
  KEYCODE_INFO: 165,
  KEYCODE_CHANNEL_UP: 166,
  KEYCODE_CHANNEL_DOWN: 167,
  KEYCODE_ZOOM_IN: 168,
  KEYCODE_ZOOM_OUT: 169,
  KEYCODE_TV: 170,
  KEYCODE_WINDOW: 171,
  KEYCODE_GUIDE: 172,
  KEYCODE_DVR: 173,
  KEYCODE_BOOKMARK: 174,
  KEYCODE_CAPTIONS: 175,
  KEYCODE_SETTINGS: 176,
  KEYCODE_TV_POWER: 177,
  KEYCODE_TV_INPUT: 178,
  KEYCODE_STB_POWER: 179,
  KEYCODE_STB_INPUT: 180,
  KEYCODE_AVR_POWER: 181,
  KEYCODE_AVR_INPUT: 182,
  KEYCODE_PROG_RED: 183,
  KEYCODE_PROG_GREEN: 184,
  KEYCODE_PROG_YELLOW: 185,
  KEYCODE_PROG_BLUE: 186,
  KEYCODE_APP_SWITCH: 187,
  KEYCODE_LANGUAGE_SWITCH: 204,
  KEYCODE_ASSIST: 219,
  KEYCODE_BRIGHTNESS_DOWN: 220,
  KEYCODE_BRIGHTNESS_UP: 221,
  KEYCODE_SLEEP: 223,
  KEYCODE_WAKEUP: 224,
  KEYCODE_SOFT_SLEEP: 276,
} as const;

// Map based on event.code for layout independence
const codeMap: { [code: string]: number } = {
  'KeyA': ANDROID_KEYS.KEYCODE_A, 'KeyB': ANDROID_KEYS.KEYCODE_B, 'KeyC': ANDROID_KEYS.KEYCODE_C,
  'KeyD': ANDROID_KEYS.KEYCODE_D, 'KeyE': ANDROID_KEYS.KEYCODE_E, 'KeyF': ANDROID_KEYS.KEYCODE_F,
  'KeyG': ANDROID_KEYS.KEYCODE_G, 'KeyH': ANDROID_KEYS.KEYCODE_H, 'KeyI': ANDROID_KEYS.KEYCODE_I,
  'KeyJ': ANDROID_KEYS.KEYCODE_J, 'KeyK': ANDROID_KEYS.KEYCODE_K, 'KeyL': ANDROID_KEYS.KEYCODE_L,
  'KeyM': ANDROID_KEYS.KEYCODE_M, 'KeyN': ANDROID_KEYS.KEYCODE_N, 'KeyO': ANDROID_KEYS.KEYCODE_O,
  'KeyP': ANDROID_KEYS.KEYCODE_P, 'KeyQ': ANDROID_KEYS.KEYCODE_Q, 'KeyR': ANDROID_KEYS.KEYCODE_R,
  'KeyS': ANDROID_KEYS.KEYCODE_S, 'KeyT': ANDROID_KEYS.KEYCODE_T, 'KeyU': ANDROID_KEYS.KEYCODE_U,
  'KeyV': ANDROID_KEYS.KEYCODE_V, 'KeyW': ANDROID_KEYS.KEYCODE_W, 'KeyX': ANDROID_KEYS.KEYCODE_X,
  'KeyY': ANDROID_KEYS.KEYCODE_Y, 'KeyZ': ANDROID_KEYS.KEYCODE_Z,
  'Digit0': ANDROID_KEYS.KEYCODE_0, 'Digit1': ANDROID_KEYS.KEYCODE_1, 'Digit2': ANDROID_KEYS.KEYCODE_2,
  'Digit3': ANDROID_KEYS.KEYCODE_3, 'Digit4': ANDROID_KEYS.KEYCODE_4, 'Digit5': ANDROID_KEYS.KEYCODE_5,
  'Digit6': ANDROID_KEYS.KEYCODE_6, 'Digit7': ANDROID_KEYS.KEYCODE_7, 'Digit8': ANDROID_KEYS.KEYCODE_8,
  'Digit9': ANDROID_KEYS.KEYCODE_9,
  'Backquote': ANDROID_KEYS.KEYCODE_GRAVE,
  'Minus': ANDROID_KEYS.KEYCODE_MINUS,
  'Equal': ANDROID_KEYS.KEYCODE_EQUALS,
  'BracketLeft': ANDROID_KEYS.KEYCODE_LEFT_BRACKET,
  'BracketRight': ANDROID_KEYS.KEYCODE_RIGHT_BRACKET,
  'Backslash': ANDROID_KEYS.KEYCODE_BACKSLASH,
  'Semicolon': ANDROID_KEYS.KEYCODE_SEMICOLON,
  'Quote': ANDROID_KEYS.KEYCODE_APOSTROPHE,
  'Comma': ANDROID_KEYS.KEYCODE_COMMA,
  'Period': ANDROID_KEYS.KEYCODE_PERIOD,
  'Slash': ANDROID_KEYS.KEYCODE_SLASH,
  'Space': ANDROID_KEYS.KEYCODE_SPACE,
  'Tab': ANDROID_KEYS.KEYCODE_TAB,
  'Escape': ANDROID_KEYS.KEYCODE_ESCAPE,
  'ArrowUp': ANDROID_KEYS.DPAD_UP,
  'ArrowDown': ANDROID_KEYS.DPAD_DOWN,
  'ArrowLeft': ANDROID_KEYS.DPAD_LEFT,
  'ArrowRight': ANDROID_KEYS.DPAD_RIGHT,
  'Enter': ANDROID_KEYS.ENTER,
  'Backspace': ANDROID_KEYS.DEL,
  'Delete': ANDROID_KEYS.FORWARD_DEL,
  'Home': ANDROID_KEYS.KEYCODE_MOVE_HOME,
  'End': ANDROID_KEYS.KEYCODE_MOVE_END,
  'PageUp': ANDROID_KEYS.KEYCODE_PAGE_UP,
  'PageDown': ANDROID_KEYS.KEYCODE_PAGE_DOWN,
  'Insert': ANDROID_KEYS.KEYCODE_INSERT,
  'F1': ANDROID_KEYS.KEYCODE_F1, 'F2': ANDROID_KEYS.KEYCODE_F2, 'F3': ANDROID_KEYS.KEYCODE_F3,
  'F4': ANDROID_KEYS.KEYCODE_F4, 'F5': ANDROID_KEYS.KEYCODE_F5, 'F6': ANDROID_KEYS.KEYCODE_F6,
  'F7': ANDROID_KEYS.KEYCODE_F7, 'F8': ANDROID_KEYS.KEYCODE_F8, 'F9': ANDROID_KEYS.KEYCODE_F9,
  'F10': ANDROID_KEYS.KEYCODE_F10, 'F11': ANDROID_KEYS.KEYCODE_F11, 'F12': ANDROID_KEYS.KEYCODE_F12,
  'ShiftLeft': ANDROID_KEYS.KEYCODE_SHIFT_LEFT, 'ShiftRight': ANDROID_KEYS.KEYCODE_SHIFT_RIGHT,
  'ControlLeft': ANDROID_KEYS.KEYCODE_CTRL_LEFT, 'ControlRight': ANDROID_KEYS.KEYCODE_CTRL_RIGHT,
  'AltLeft': ANDROID_KEYS.KEYCODE_ALT_LEFT, 'AltRight': ANDROID_KEYS.KEYCODE_ALT_RIGHT,
  'MetaLeft': ANDROID_KEYS.KEYCODE_META_LEFT, 'MetaRight': ANDROID_KEYS.KEYCODE_META_RIGHT, // Windows/Command key
  'ContextMenu': ANDROID_KEYS.MENU, // Often the Menu key
  // Numpad mappings
  'Numpad0': ANDROID_KEYS.KEYCODE_NUMPAD_0, 'Numpad1': ANDROID_KEYS.KEYCODE_NUMPAD_1,
  'Numpad2': ANDROID_KEYS.KEYCODE_NUMPAD_2, 'Numpad3': ANDROID_KEYS.KEYCODE_NUMPAD_3,
  'Numpad4': ANDROID_KEYS.KEYCODE_NUMPAD_4, 'Numpad5': ANDROID_KEYS.KEYCODE_NUMPAD_5,
  'Numpad6': ANDROID_KEYS.KEYCODE_NUMPAD_6, 'Numpad7': ANDROID_KEYS.KEYCODE_NUMPAD_7,
  'Numpad8': ANDROID_KEYS.KEYCODE_NUMPAD_8, 'Numpad9': ANDROID_KEYS.KEYCODE_NUMPAD_9,
  'NumpadDivide': ANDROID_KEYS.KEYCODE_NUMPAD_DIVIDE,
  'NumpadMultiply': ANDROID_KEYS.KEYCODE_NUMPAD_MULTIPLY,
  'NumpadSubtract': ANDROID_KEYS.KEYCODE_NUMPAD_SUBTRACT,
  'NumpadAdd': ANDROID_KEYS.KEYCODE_NUMPAD_ADD,
  'NumpadDecimal': ANDROID_KEYS.KEYCODE_NUMPAD_DOT,
  'NumpadComma': ANDROID_KEYS.KEYCODE_NUMPAD_COMMA, // Some numpads have comma
  'NumpadEnter': ANDROID_KEYS.KEYCODE_NUMPAD_ENTER,
  'NumpadEqual': ANDROID_KEYS.KEYCODE_NUMPAD_EQUALS,
};

const debugLog = (...args: any[]) => {
  if (window.debugRemoteControl) {
    console.log(...args);
  }
};

const debugWarn = (...args: any[]) => {
  if (window.debugRemoteControl) {
    console.warn(...args);
  }
};

function getAndroidKeycodeAndMeta(event: React.KeyboardEvent): { keycode: number, metaState: number } | null {
  const code = event.code;
  const keycode = codeMap[code];

  if (!keycode) {
    // Use the wrapper for conditional warning
    debugWarn(`Unknown event.code: ${code}, key: ${event.key}`);
    return null;
  }

  let metaState = ANDROID_KEYS.META_NONE;
  const isLetter = code >= 'KeyA' && code <= 'KeyZ';
  const isCapsLock = event.getModifierState("CapsLock");
  const isShiftPressed = event.shiftKey;

  // Determine effective shift state
  let effectiveShift = isShiftPressed;
  if (isLetter) {
    effectiveShift = isShiftPressed !== isCapsLock; // Logical XOR for booleans
  }

  // Apply meta states
  if (effectiveShift) metaState |= ANDROID_KEYS.META_SHIFT_ON;
  if (event.ctrlKey) metaState |= ANDROID_KEYS.META_CTRL_ON;
  if (event.altKey) metaState |= ANDROID_KEYS.META_ALT_ON;
  if (event.metaKey) metaState |= ANDROID_KEYS.META_META_ON; // Command on Mac, Windows key on Win

  return { keycode, metaState };
}

export const RemoteControl = forwardRef<RemoteControlHandle, RemoteControlProps>(({ 
  className, 
  url, 
  token, 
  sessionId: propSessionId, 
  openUrl 
}: RemoteControlProps, ref) => {
  // Add the spin animation CSS
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const videoRef = useRef<HTMLVideoElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const keepAliveIntervalRef = useRef<number | undefined>(undefined);
  const pendingScreenshotResolversRef = useRef<Map<string, (value: ScreenshotData | PromiseLike<ScreenshotData>) => void>>(new Map());
  const pendingScreenshotRejectersRef = useRef<Map<string, (reason?: any) => void>>(new Map());
  
  // Map to track active pointers (mouse or touch) and their last known position inside the video
  // Key: pointerId (-1 for mouse, touch.identifier for touch), Value: { x: number, y: number }
  const activePointers = useRef<Map<number, { x: number; y: number }>>(new Map());

  const sessionId = useMemo(() => 
    propSessionId || Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
    [propSessionId]
  );

  const updateStatus = (message: string) => {
    // Use the wrapper for conditional logging
    debugLog(message);
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

  // Unified handler for both mouse and touch interactions
  const handleInteraction = (event: React.MouseEvent | React.TouchEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (!dataChannelRef.current || dataChannelRef.current.readyState !== 'open' || !videoRef.current) {
      return;
    }

    const video = videoRef.current;
    const rect = video.getBoundingClientRect();
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    if (!videoWidth || !videoHeight) return; // Video dimensions not ready

    // Helper to process a single pointer event (either mouse or a single touch point)
    const processPointer = ( 
      pointerId: number, 
      clientX: number, 
      clientY: number, 
      eventType: 'down' | 'move' | 'up' | 'cancel' 
    ) => {

      // --- Start: Coordinate Calculation --- 
      const displayWidth = rect.width;
      const displayHeight = rect.height;
      const videoAspectRatio = videoWidth / videoHeight;
      const containerAspectRatio = displayWidth / displayHeight;
      let actualWidth = displayWidth;
      let actualHeight = displayHeight;
      if (videoAspectRatio > containerAspectRatio) {
        actualHeight = displayWidth / videoAspectRatio;
      } else {
        actualWidth = displayHeight * videoAspectRatio;
      }
      const offsetX = (displayWidth - actualWidth) / 2;
      const offsetY = (displayHeight - actualHeight) / 2;
      const relativeX = clientX - rect.left - offsetX;
      const relativeY = clientY - rect.top - offsetY;
      const isInside = relativeX >= 0 && relativeX <= actualWidth && relativeY >= 0 && relativeY <= actualHeight;
      
      let videoX = 0;
      let videoY = 0;
      if (isInside) {
        videoX = Math.max(0, Math.min(videoWidth, (relativeX / actualWidth) * videoWidth));
        videoY = Math.max(0, Math.min(videoHeight, (relativeY / actualHeight) * videoHeight));
      }
      // --- End: Coordinate Calculation ---

      let action: number | null = null;
      let positionToSend: { x: number; y: number } | null = null;
      let pressure = 1.0; // Default pressure
      const buttons = AMOTION_EVENT.BUTTON_PRIMARY; // Assume primary button

      switch (eventType) {
        case 'down':
          if (isInside) {
            action = AMOTION_EVENT.ACTION_DOWN;
            positionToSend = { x: videoX, y: videoY };
            activePointers.current.set(pointerId, positionToSend);
            if (pointerId === -1) { // Focus on mouse down
              videoRef.current?.focus();
            }
          } else {
            // If the initial down event is outside, ignore it for this pointer
            activePointers.current.delete(pointerId);
          }
          break;

        case 'move':
          if (activePointers.current.has(pointerId)) {
            if (isInside) {
              action = AMOTION_EVENT.ACTION_MOVE;
              positionToSend = { x: videoX, y: videoY };
              // Update the last known position for this active pointer
              activePointers.current.set(pointerId, positionToSend);
            } else {
              // Moved outside while active - do nothing, UP/CANCEL will use last known pos
            }
          }
          break;

        case 'up':
        case 'cancel': // Treat cancel like up, but use ACTION_CANCEL
          if (activePointers.current.has(pointerId)) {
            action = (eventType === 'cancel' ? AMOTION_EVENT.ACTION_CANCEL : AMOTION_EVENT.ACTION_UP);
            // IMPORTANT: Send the UP/CANCEL at the *last known position* inside the video
            positionToSend = activePointers.current.get(pointerId)!;
            activePointers.current.delete(pointerId); // Remove pointer as it's no longer active
          }
          break;
      }

      // Send message if action and position determined
      if (action !== null && positionToSend !== null) {
        const message = createTouchControlMessage(
          action,
          pointerId,
          positionToSend.x,
          positionToSend.y,
          pressure,
          buttons,
          buttons
        );
        if (message) {
          sendBinaryControlMessage(message);
        }
      } else if (eventType === 'up' || eventType === 'cancel') {
         // Clean up map just in case if 'down' was outside and 'up'/'cancel' is triggered
         activePointers.current.delete(pointerId);
      }
    };

    // --- Event Type Handling --- 

    if ('touches' in event) { // Touch Events
      const touches = event.changedTouches; // Use changedTouches for start/end/cancel
      let eventType: 'down' | 'move' | 'up' | 'cancel';

      switch (event.type) {
        case 'touchstart': eventType = 'down'; break;
        case 'touchmove': eventType = 'move'; break;
        case 'touchend': eventType = 'up'; break;
        case 'touchcancel': eventType = 'cancel'; break;
        default: return; // Should not happen
      }

      for (let i = 0; i < touches.length; i++) {
        const touch = touches[i];
        processPointer(touch.identifier, touch.clientX, touch.clientY, eventType);
      }

    } else { // Mouse Events
      const pointerId = -1; // Use -1 for mouse pointer
      let eventType: 'down' | 'move' | 'up' | 'cancel' | null = null;

      switch (event.type) {
        case 'mousedown':
          if (event.button === 0) eventType = 'down'; // Only primary button
          break;
        case 'mousemove':
          // Only process move if primary button is down (check map)
          if (activePointers.current.has(pointerId)) {
             eventType = 'move';
          }
          break;
        case 'mouseup':
          if (event.button === 0) eventType = 'up'; // Only primary button
          break;
        case 'mouseleave':
           // Treat leave like up only if button was down
           if (activePointers.current.has(pointerId)) {
              eventType = 'up'; 
           } 
          break;
      }
      
      if (eventType) {
        processPointer(pointerId, event.clientX, event.clientY, eventType);
      }
    }
  };

  const handleKeyboard = (event: React.KeyboardEvent) => {
    event.preventDefault();
    event.stopPropagation();
    // Use the wrapper for conditional logging
    debugLog('Keyboard event:', {
      type: event.type,
      key: event.key,
      keyCode: event.keyCode,
      code: event.code,
      target: (event.target as HTMLElement).tagName,
      focused: document.activeElement === videoRef.current,
    });

    if (document.activeElement !== videoRef.current) {
      // Use the wrapper for conditional warning
      debugWarn('Video element not focused, skipping keyboard event');
      return;
    }

    if (!dataChannelRef.current || dataChannelRef.current.readyState !== 'open') {
      // Use the wrapper for conditional warning
      debugWarn('Data channel not ready for keyboard event:', dataChannelRef.current?.readyState);
      return;
    }

    // Handle special shortcuts first (Paste, Menu)
    if (event.type === 'keydown') {
      // Paste (Cmd+V / Ctrl+V)
      if (event.key.toLowerCase() === 'v' && (event.metaKey || event.ctrlKey)) {
        debugLog('Paste shortcut detected');
        navigator.clipboard.readText().then(text => {
          if (text) {
            debugLog('Pasting text via SET_CLIPBOARD:', text.substring(0, 20) + (text.length > 20 ? '...' : ''));
            const message = createSetClipboardMessage(text, true); // paste=true
            sendBinaryControlMessage(message);
          }
        }).catch(err => {
          console.error('Failed to read clipboard contents: ', err);
        });
        return; // Don't process 'v' keycode further
      }
      
      // Menu (Cmd+M / Ctrl+M) - Send down and up immediately
      if (event.key.toLowerCase() === 'm' && (event.metaKey || event.ctrlKey)) {
        debugLog('Menu shortcut detected');
        const messageDown = createInjectKeycodeMessage(
          ANDROID_KEYS.ACTION_DOWN,
          ANDROID_KEYS.MENU,
          0,
          ANDROID_KEYS.META_NONE // Modifiers are handled by the shortcut check, not passed down
        );
        sendBinaryControlMessage(messageDown);
        const messageUp = createInjectKeycodeMessage(
          ANDROID_KEYS.ACTION_UP,
          ANDROID_KEYS.MENU,
          0,
          ANDROID_KEYS.META_NONE
        );
        sendBinaryControlMessage(messageUp);
        return; // Don't process 'm' keycode further
      }
    }

    // Handle general key presses (including Arrows, Enter, Backspace, Delete, Letters, Numbers, Symbols)
    const keyInfo = getAndroidKeycodeAndMeta(event);

    if (keyInfo) {
      const { keycode, metaState } = keyInfo;
      const action = event.type === 'keydown' ? ANDROID_KEYS.ACTION_DOWN : ANDROID_KEYS.ACTION_UP;
      
      debugLog(`Sending Keycode: key=${event.key}, code=${keycode}, action=${action}, meta=${metaState}`);

      const message = createInjectKeycodeMessage(
        action,
        keycode,
        0, // repeat count, typically 0 for single presses
        metaState
      );
      sendBinaryControlMessage(message);
    } else {
       debugLog(`Ignoring unhandled key event: type=${event.type}, key=${event.key}`);
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
      peerConnectionRef.current = new RTCPeerConnection(rtcConfig);
      peerConnectionRef.current.addTransceiver('audio', { direction: 'recvonly' });
      peerConnectionRef.current.addTransceiver('video', { direction: 'recvonly' });
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
          debugLog(`[${new Date().toISOString()}] Video track received:`, event.track);
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
        let message;
        try {
          message = JSON.parse(event.data);
        } catch (e) {
          debugWarn('Error parsing message:', e);
          return;
        }
        updateStatus('Received: ' + message.type);
        switch (message.type) {
          case 'answer':
            if (!peerConnectionRef.current) {
              updateStatus('No peer connection, skipping answer');
              break;
            }
            await peerConnectionRef.current.setRemoteDescription(
              new RTCSessionDescription({
                type: 'answer',
                sdp: message.sdp
              })
            );
            updateStatus('Set remote description');
            break;
          case 'candidate':
            if (!peerConnectionRef.current) {
              updateStatus('No peer connection, skipping candidate');
              break;
            }
            await peerConnectionRef.current.addIceCandidate(
              new RTCIceCandidate({
                  candidate: message.candidate,
                  sdpMid: message.sdpMid,
                  sdpMLineIndex: message.sdpMLineIndex
                })
              );
            updateStatus('Added ICE candidate');
            break;
          case 'screenshot':
            if (typeof message.id !== 'string' || typeof message.dataUri !== 'string') {
              debugWarn('Received invalid screenshot success message:', message);
              break;
            }
            const resolver = pendingScreenshotResolversRef.current.get(message.id);
            if (!resolver) {
              debugWarn(`Received screenshot data for unknown or handled id: ${message.id}`);
              break;
            }
            debugLog(`Received screenshot data for id ${message.id}`);
            resolver({ dataUri: message.dataUri });
            pendingScreenshotResolversRef.current.delete(message.id);
            pendingScreenshotRejectersRef.current.delete(message.id);
            break;
          case 'screenshotError':
            if (typeof message.id !== 'string' || typeof message.message !== 'string') {
              debugWarn('Received invalid screenshot error message:', message);
              break;
            }
            const rejecter = pendingScreenshotRejectersRef.current.get(message.id);
            if (!rejecter) {
              debugWarn(`Received screenshot error for unknown or handled id: ${message.id}`);
              break;
            }
            debugWarn(`Received screenshot error for id ${message.id}: ${message.message}`);
            rejecter(new Error(message.message));
            pendingScreenshotResolversRef.current.delete(message.id);
            pendingScreenshotRejectersRef.current.delete(message.id);
            break;
          default:
            debugWarn(`Received unhandled message type: ${message.type}`, message);
            break;
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

  // Expose sendOpenUrlCommand via ref
  useImperativeHandle(ref, () => ({
    openUrl: (newUrl: string) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        debugWarn('WebSocket not open, cannot send open_url command via ref.');
        return;
      }
      try {
        const decodedUrl = decodeURIComponent(newUrl);
        updateStatus('Opening URL');
        wsRef.current.send(JSON.stringify({
          type: 'openUrl',
          url: decodedUrl,
          sessionId: sessionId
        }));
      } catch (error) {
        debugWarn('Error decoding or sending URL via ref:', {error, url: newUrl});
        wsRef.current.send(JSON.stringify({
          type: 'openUrl',
          url: newUrl,
          sessionId: sessionId
        }));
      }
    },
    
    sendKeyEvent: (event: ImperativeKeyboardEvent) => {
      if (!dataChannelRef.current || dataChannelRef.current.readyState !== 'open') {
        debugWarn('Data channel not ready for imperative key command:', dataChannelRef.current?.readyState);
        return;
      }

      const keycode = codeMap[event.code];
      if (!keycode) {
        debugWarn(`Unknown event.code for imperative command: ${event.code}`);
        return;
      }

      let metaState = ANDROID_KEYS.META_NONE;
      if (event.shiftKey) metaState |= ANDROID_KEYS.META_SHIFT_ON;
      if (event.altKey) metaState |= ANDROID_KEYS.META_ALT_ON;
      if (event.ctrlKey) metaState |= ANDROID_KEYS.META_CTRL_ON;
      if (event.metaKey) metaState |= ANDROID_KEYS.META_META_ON;

      const action = event.type === 'keydown' ? ANDROID_KEYS.ACTION_DOWN : ANDROID_KEYS.ACTION_UP;
      
      debugLog(`Sending Imperative Key Command: code=${event.code}, keycode=${keycode}, action=${action}, meta=${metaState}`);

      const message = createInjectKeycodeMessage(
        action,
        keycode,
        0, // repeat count, typically 0 for single presses
        metaState
      );
      if (message) {
        sendBinaryControlMessage(message);
      }
    },
    screenshot: (): Promise<ScreenshotData> => {
      return new Promise<ScreenshotData>((resolve, reject) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          debugWarn('WebSocket not open, cannot send screenshot command.');
          return reject(new Error('WebSocket is not connected or connection is not open.'));
        }

        const id = `ui-ss-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const request = {
          type: 'screenshot', // Matches the type expected by instance API
          id: id,
        };

        pendingScreenshotResolversRef.current.set(id, resolve);
        pendingScreenshotRejectersRef.current.set(id, reject);

        debugLog('Sending screenshot request:', request);
        try {
          wsRef.current.send(JSON.stringify(request));
        } catch (err) {
          debugWarn('Failed to send screenshot request immediately:', err);
          pendingScreenshotResolversRef.current.delete(id);
          pendingScreenshotRejectersRef.current.delete(id);
          reject(err);
          return; // Important to return here if send failed synchronously
        }

        setTimeout(() => {
          if (pendingScreenshotResolversRef.current.has(id)) {
            debugWarn(`Screenshot request timed out for id ${id}`);
            pendingScreenshotRejectersRef.current.get(id)?.(new Error('Screenshot request timed out'));
            pendingScreenshotResolversRef.current.delete(id);
            pendingScreenshotRejectersRef.current.delete(id);
          }
        }, 30000); // 30-second timeout
      });
    }
  }));

  return (
    <div 
      className={className}
      style={{
        touchAction: 'none'
      }}
      // Attach unified handler to all interaction events on the container
      onMouseDown={handleInteraction} 
      onMouseMove={handleInteraction}
      onMouseUp={handleInteraction}
      onMouseLeave={handleInteraction} // Handle mouse leaving the container
      onTouchStart={handleInteraction}
      onTouchMove={handleInteraction}
      onTouchEnd={handleInteraction}
      onTouchCancel={handleInteraction}
    >
      <video
        ref={videoRef}
        className=""
        autoPlay
        playsInline
        tabIndex={0} // Make it focusable
        style={{
          outline: 'none',
          pointerEvents: 'none',
          cursor: 'none'
        }}
        onKeyDown={handleKeyboard}
        onKeyUp={handleKeyboard}
        onClick={handleVideoClick}
        onFocus={() => {
          if (videoRef.current) {
            videoRef.current.style.outline = 'none';
          }
        }}
        onBlur={() => {
          if (videoRef.current) {
            videoRef.current.style.outline = 'none';
          }
        }}
      />
      {!isConnected && (
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              animation: 'spin 1s linear infinite',
              borderRadius: '50%',
              height: '32px',
              width: '32px',
              borderTop: '2px solid #3b82f6', // blue-500 color
              borderRight: '2px solid transparent',
              borderBottom: '2px solid transparent',
              borderLeft: '2px solid transparent',
              margin: '0 auto 8px auto'
            }}></div>
            <p style={{
              fontSize: '14px',
              color: '#6b7280' // gray-500 color
            }}>Connecting...</p>
          </div>
        </div>
      )}
    </div>
  );
});