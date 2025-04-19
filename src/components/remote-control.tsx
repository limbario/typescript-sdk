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

function getAndroidKeycodeAndMeta(event: React.KeyboardEvent): { keycode: number, metaState: number } | null {
  const code = event.code;
  const keycode = codeMap[code];

  if (!keycode) {
    console.warn(`Unknown event.code: ${code}, key: ${event.key}`);
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

    // Skip mousemove events only when no button is pressed (hover events)
    if (!('touches' in event) && event.type === 'mousemove' && (event as React.MouseEvent).buttons === 0) {
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
    event.preventDefault();
    event.stopPropagation();
    console.log('Keyboard event:', {
      type: event.type,
      key: event.key,
      keyCode: event.keyCode,
      code: event.code,
      target: (event.target as HTMLElement).tagName,
      focused: document.activeElement === videoRef.current,
    });

    if (document.activeElement !== videoRef.current) {
      console.warn('Video element not focused, skipping keyboard event');
      return;
    }

    if (!dataChannelRef.current || dataChannelRef.current.readyState !== 'open') {
      console.warn('Data channel not ready for keyboard event:', dataChannelRef.current?.readyState);
      return;
    }

    // Handle special shortcuts first (Paste, Menu)
    if (event.type === 'keydown') {
      // Paste (Cmd+V / Ctrl+V)
      if (event.key.toLowerCase() === 'v' && (event.metaKey || event.ctrlKey)) {
        console.log('Paste shortcut detected');
        navigator.clipboard.readText().then(text => {
          if (text) {
            console.log('Pasting text via SET_CLIPBOARD:', text.substring(0, 20) + (text.length > 20 ? '...' : ''));
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
        console.log('Menu shortcut detected');
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
      
      console.log(`Sending Keycode: key=${event.key}, code=${keycode}, action=${action}, meta=${metaState}`);

      const message = createInjectKeycodeMessage(
        action,
        keycode,
        0, // repeat count, typically 0 for single presses
        metaState
      );
      sendBinaryControlMessage(message);
    } else {
       console.log(`Ignoring unhandled key event: type=${event.type}, key=${event.key}`);
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
        onKeyUp={handleKeyboard}
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