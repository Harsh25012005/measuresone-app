import React from 'react';
import Svg, { Path, Circle, Rect, Line } from 'react-native-svg';
import { useTheme } from '../../../context/ThemeContext';

export type TablerIconName = 'home' | 'orders' | 'users' | 'user' | 'scissors' | 'plus' | 'minus' | 'back' | 'chev' | 'chevL' | 'settings' | 'phone' | 'chat' | 'clock' | 'ruler' | 'trash' | 'edit' | 'check' | 'search' | 'x' | 'copy' | 'rupee' | 'alert' | 'calendar' | 'receipt' | 'bell' | 'moon' | 'lock' | 'board' | 'list' | 'chart' | 'wallet' | 'box' | 'grid' | 'sun' | 'mic' | 'camera' | 'history' | 'gift' | 'wrench' | 'tag' | 'userCheck' | 'arrowR' | 'arrowL' | 'down' | 'up' | 'upload' | 'job' | 'backspace' | 'sliders' | 'globe' | 'star' | 'starF' | 'type' | 'download' | 'ban' | 'undo' | 'target' | 'share' | 'spool' | 'report' | 'needle' | 'hanger' | 'userPlus' | 'package' | 'cash' | 'truck' | 'sparkle' | 'dots' | 'filter' | 'logout' | 'palette' | 'language' | 'cloud' | 'shield' | 'flame' | 'progress' | 'circleCheck' | 'hourglass' | 'photo' | 'note' | 'building' | 'calendarEvent' | 'coin' | 'chevD' | 'eye' | 'eyeOff' | 'info' | 'cloudOff' | 'refresh';

export type IconProps = {
  name: TablerIconName | string;
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: any;
};

const TABLER_ICONS: Record<string, Array<{ type: string; [key: string]: any }>> = {
  "home": [
    {
      "type": "path",
      "d": "M19 8.71l-5.333 -4.148a2.666 2.666 0 0 0 -3.274 0l-5.334 4.148a2.665 2.665 0 0 0 -1.029 2.105v7.2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-7.2c0 -.823 -.38 -1.6 -1.03 -2.105"
    },
    {
      "type": "path",
      "d": "M16 15c-2.21 1.333 -5.792 1.333 -8 0"
    }
  ],
  "orders": [
    {
      "type": "path",
      "d": "M9 5h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2h-2"
    },
    {
      "type": "path",
      "d": "M9 5a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2"
    },
    {
      "type": "path",
      "d": "M9 12l.01 0"
    },
    {
      "type": "path",
      "d": "M13 12l2 0"
    },
    {
      "type": "path",
      "d": "M9 16l.01 0"
    },
    {
      "type": "path",
      "d": "M13 16l2 0"
    }
  ],
  "users": [
    {
      "type": "path",
      "d": "M5 7a4 4 0 1 0 8 0a4 4 0 1 0 -8 0"
    },
    {
      "type": "path",
      "d": "M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2"
    },
    {
      "type": "path",
      "d": "M16 3.13a4 4 0 0 1 0 7.75"
    },
    {
      "type": "path",
      "d": "M21 21v-2a4 4 0 0 0 -3 -3.85"
    }
  ],
  "user": [
    {
      "type": "path",
      "d": "M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0"
    },
    {
      "type": "path",
      "d": "M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2"
    }
  ],
  "scissors": [
    {
      "type": "path",
      "d": "M3 7a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"
    },
    {
      "type": "path",
      "d": "M3 17a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"
    },
    {
      "type": "path",
      "d": "M8.6 8.6l10.4 10.4"
    },
    {
      "type": "path",
      "d": "M8.6 15.4l10.4 -10.4"
    }
  ],
  "plus": [
    {
      "type": "path",
      "d": "M12 5l0 14"
    },
    {
      "type": "path",
      "d": "M5 12l14 0"
    }
  ],
  "minus": [
    {
      "type": "path",
      "d": "M5 12l14 0"
    }
  ],
  "back": [
    {
      "type": "path",
      "d": "M5 12l14 0"
    },
    {
      "type": "path",
      "d": "M5 12l6 6"
    },
    {
      "type": "path",
      "d": "M5 12l6 -6"
    }
  ],
  "chev": [
    {
      "type": "path",
      "d": "M9 6l6 6l-6 6"
    }
  ],
  "chevL": [
    {
      "type": "path",
      "d": "M15 6l-6 6l6 6"
    }
  ],
  "settings": [
    {
      "type": "path",
      "d": "M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065"
    },
    {
      "type": "path",
      "d": "M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0"
    }
  ],
  "phone": [
    {
      "type": "path",
      "d": "M5 4h4l2 5l-2.5 1.5a11 11 0 0 0 5 5l1.5 -2.5l5 2v4a2 2 0 0 1 -2 2a16 16 0 0 1 -15 -15a2 2 0 0 1 2 -2"
    }
  ],
  "chat": [
    {
      "type": "path",
      "d": "M3 21l1.65 -3.8a9 9 0 1 1 3.4 2.9l-5.05 .9"
    },
    {
      "type": "path",
      "d": "M9 10a.5 .5 0 0 0 1 0v-1a.5 .5 0 0 0 -1 0v1a5 5 0 0 0 5 5h1a.5 .5 0 0 0 0 -1h-1a.5 .5 0 0 0 0 1"
    }
  ],
  "clock": [
    {
      "type": "path",
      "d": "M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0"
    },
    {
      "type": "path",
      "d": "M12 7v5l3 3"
    }
  ],
  "ruler": [
    {
      "type": "path",
      "d": "M19.875 12c.621 0 1.125 .512 1.125 1.143v5.714c0 .631 -.504 1.143 -1.125 1.143h-15.875a1 1 0 0 1 -1 -1v-5.857c0 -.631 .504 -1.143 1.125 -1.143h15.75"
    },
    {
      "type": "path",
      "d": "M9 12v2"
    },
    {
      "type": "path",
      "d": "M6 12v3"
    },
    {
      "type": "path",
      "d": "M12 12v3"
    },
    {
      "type": "path",
      "d": "M18 12v3"
    },
    {
      "type": "path",
      "d": "M15 12v2"
    },
    {
      "type": "path",
      "d": "M3 3v4"
    },
    {
      "type": "path",
      "d": "M3 5h18"
    },
    {
      "type": "path",
      "d": "M21 3v4"
    }
  ],
  "trash": [
    {
      "type": "path",
      "d": "M4 7l16 0"
    },
    {
      "type": "path",
      "d": "M10 11l0 6"
    },
    {
      "type": "path",
      "d": "M14 11l0 6"
    },
    {
      "type": "path",
      "d": "M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12"
    },
    {
      "type": "path",
      "d": "M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3"
    }
  ],
  "edit": [
    {
      "type": "path",
      "d": "M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4"
    },
    {
      "type": "path",
      "d": "M13.5 6.5l4 4"
    }
  ],
  "check": [
    {
      "type": "path",
      "d": "M5 12l5 5l10 -10"
    }
  ],
  "search": [
    {
      "type": "path",
      "d": "M3 10a7 7 0 1 0 14 0a7 7 0 1 0 -14 0"
    },
    {
      "type": "path",
      "d": "M21 21l-6 -6"
    }
  ],
  "x": [
    {
      "type": "path",
      "d": "M18 6l-12 12"
    },
    {
      "type": "path",
      "d": "M6 6l12 12"
    }
  ],
  "copy": [
    {
      "type": "path",
      "d": "M7 9.667a2.667 2.667 0 0 1 2.667 -2.667h8.666a2.667 2.667 0 0 1 2.667 2.667v8.666a2.667 2.667 0 0 1 -2.667 2.667h-8.666a2.667 2.667 0 0 1 -2.667 -2.667l0 -8.666"
    },
    {
      "type": "path",
      "d": "M4.012 16.737a2.005 2.005 0 0 1 -1.012 -1.737v-10c0 -1.1 .9 -2 2 -2h10c.75 0 1.158 .385 1.5 1"
    }
  ],
  "rupee": [
    {
      "type": "path",
      "d": "M18 5h-11h3a4 4 0 0 1 0 8h-3l6 6"
    },
    {
      "type": "path",
      "d": "M7 9l11 0"
    }
  ],
  "alert": [
    {
      "type": "path",
      "d": "M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0"
    },
    {
      "type": "path",
      "d": "M12 8v4"
    },
    {
      "type": "path",
      "d": "M12 16h.01"
    }
  ],
  "calendar": [
    {
      "type": "path",
      "d": "M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12"
    },
    {
      "type": "path",
      "d": "M16 3v4"
    },
    {
      "type": "path",
      "d": "M8 3v4"
    },
    {
      "type": "path",
      "d": "M4 11h16"
    },
    {
      "type": "path",
      "d": "M11 15h1"
    },
    {
      "type": "path",
      "d": "M12 15v3"
    }
  ],
  "receipt": [
    {
      "type": "path",
      "d": "M5 21v-16a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v16l-3 -2l-2 2l-2 -2l-2 2l-2 -2l-3 2m4 -14h6m-6 4h6m-2 4h2"
    }
  ],
  "bell": [
    {
      "type": "path",
      "d": "M10 5a2 2 0 1 1 4 0a7 7 0 0 1 4 6v3a4 4 0 0 0 2 3h-16a4 4 0 0 0 2 -3v-3a7 7 0 0 1 4 -6"
    },
    {
      "type": "path",
      "d": "M9 17v1a3 3 0 0 0 6 0v-1"
    }
  ],
  "moon": [
    {
      "type": "path",
      "d": "M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454l0 .008"
    }
  ],
  "lock": [
    {
      "type": "path",
      "d": "M5 13a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v6a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-6"
    },
    {
      "type": "path",
      "d": "M11 16a1 1 0 1 0 2 0a1 1 0 0 0 -2 0"
    },
    {
      "type": "path",
      "d": "M8 11v-4a4 4 0 1 1 8 0v4"
    }
  ],
  "board": [
    {
      "type": "path",
      "d": "M4 4l6 0"
    },
    {
      "type": "path",
      "d": "M14 4l6 0"
    },
    {
      "type": "path",
      "d": "M4 10a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2l0 -8"
    },
    {
      "type": "path",
      "d": "M14 10a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v2a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2l0 -2"
    }
  ],
  "list": [
    {
      "type": "path",
      "d": "M9 6l11 0"
    },
    {
      "type": "path",
      "d": "M9 12l11 0"
    },
    {
      "type": "path",
      "d": "M9 18l11 0"
    },
    {
      "type": "path",
      "d": "M5 6l0 .01"
    },
    {
      "type": "path",
      "d": "M5 12l0 .01"
    },
    {
      "type": "path",
      "d": "M5 18l0 .01"
    }
  ],
  "chart": [
    {
      "type": "path",
      "d": "M3 13a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -6"
    },
    {
      "type": "path",
      "d": "M15 9a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v10a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -10"
    },
    {
      "type": "path",
      "d": "M9 5a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v14a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -14"
    },
    {
      "type": "path",
      "d": "M4 20h14"
    }
  ],
  "wallet": [
    {
      "type": "path",
      "d": "M17 8v-3a1 1 0 0 0 -1 -1h-10a2 2 0 0 0 0 4h12a1 1 0 0 1 1 1v3m0 4v3a1 1 0 0 1 -1 1h-12a2 2 0 0 1 -2 -2v-12"
    },
    {
      "type": "path",
      "d": "M20 12v4h-4a2 2 0 0 1 0 -4h4"
    }
  ],
  "box": [
    {
      "type": "path",
      "d": "M12 3l8 4.5l0 9l-8 4.5l-8 -4.5l0 -9l8 -4.5"
    },
    {
      "type": "path",
      "d": "M12 12l8 -4.5"
    },
    {
      "type": "path",
      "d": "M12 12l0 9"
    },
    {
      "type": "path",
      "d": "M12 12l-8 -4.5"
    }
  ],
  "grid": [
    {
      "type": "path",
      "d": "M4 5a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -4"
    },
    {
      "type": "path",
      "d": "M14 5a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -4"
    },
    {
      "type": "path",
      "d": "M4 15a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -4"
    },
    {
      "type": "path",
      "d": "M14 15a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -4"
    }
  ],
  "sun": [
    {
      "type": "path",
      "d": "M8 12a4 4 0 1 0 8 0a4 4 0 1 0 -8 0"
    },
    {
      "type": "path",
      "d": "M3 12h1m8 -9v1m8 8h1m-9 8v1m-6.4 -15.4l.7 .7m12.1 -.7l-.7 .7m0 11.4l.7 .7m-12.1 -.7l-.7 .7"
    }
  ],
  "mic": [
    {
      "type": "path",
      "d": "M9 5a3 3 0 0 1 3 -3a3 3 0 0 1 3 3v5a3 3 0 0 1 -3 3a3 3 0 0 1 -3 -3l0 -5"
    },
    {
      "type": "path",
      "d": "M5 10a7 7 0 0 0 14 0"
    },
    {
      "type": "path",
      "d": "M8 21l8 0"
    },
    {
      "type": "path",
      "d": "M12 17l0 4"
    }
  ],
  "camera": [
    {
      "type": "path",
      "d": "M5 7h1a2 2 0 0 0 2 -2a1 1 0 0 1 1 -1h6a1 1 0 0 1 1 1a2 2 0 0 0 2 2h1a2 2 0 0 1 2 2v9a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-9a2 2 0 0 1 2 -2"
    },
    {
      "type": "path",
      "d": "M9 13a3 3 0 1 0 6 0a3 3 0 0 0 -6 0"
    }
  ],
  "history": [
    {
      "type": "path",
      "d": "M12 8l0 4l2 2"
    },
    {
      "type": "path",
      "d": "M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5"
    }
  ],
  "gift": [
    {
      "type": "path",
      "d": "M3 9a1 1 0 0 1 1 -1h16a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-16a1 1 0 0 1 -1 -1l0 -2"
    },
    {
      "type": "path",
      "d": "M12 8l0 13"
    },
    {
      "type": "path",
      "d": "M19 12v7a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-7"
    },
    {
      "type": "path",
      "d": "M7.5 8a2.5 2.5 0 0 1 0 -5a4.8 8 0 0 1 4.5 5a4.8 8 0 0 1 4.5 -5a2.5 2.5 0 0 1 0 5"
    }
  ],
  "wrench": [
    {
      "type": "path",
      "d": "M7 10h3v-3l-3.5 -3.5a6 6 0 0 1 8 8l6 6a2 2 0 0 1 -3 3l-6 -6a6 6 0 0 1 -8 -8l3.5 3.5"
    }
  ],
  "tag": [
    {
      "type": "path",
      "d": "M15 4l6 2v5h-3v8a1 1 0 0 1 -1 1h-10a1 1 0 0 1 -1 -1v-8h-3v-5l6 -2a3 3 0 0 0 6 0"
    }
  ],
  "userCheck": [
    {
      "type": "path",
      "d": "M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0"
    },
    {
      "type": "path",
      "d": "M6 21v-2a4 4 0 0 1 4 -4h4"
    },
    {
      "type": "path",
      "d": "M15 19l2 2l4 -4"
    }
  ],
  "arrowR": [
    {
      "type": "path",
      "d": "M5 12l14 0"
    },
    {
      "type": "path",
      "d": "M13 18l6 -6"
    },
    {
      "type": "path",
      "d": "M13 6l6 6"
    }
  ],
  "arrowL": [
    {
      "type": "path",
      "d": "M5 12l14 0"
    },
    {
      "type": "path",
      "d": "M5 12l6 6"
    },
    {
      "type": "path",
      "d": "M5 12l6 -6"
    }
  ],
  "down": [
    {
      "type": "path",
      "d": "M12 5l0 14"
    },
    {
      "type": "path",
      "d": "M18 13l-6 6"
    },
    {
      "type": "path",
      "d": "M6 13l6 6"
    }
  ],
  "up": [
    {
      "type": "path",
      "d": "M12 5l0 14"
    },
    {
      "type": "path",
      "d": "M18 11l-6 -6"
    },
    {
      "type": "path",
      "d": "M6 11l6 -6"
    }
  ],
  "upload": [
    {
      "type": "path",
      "d": "M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2"
    },
    {
      "type": "path",
      "d": "M7 9l5 -5l5 5"
    },
    {
      "type": "path",
      "d": "M12 4l0 12"
    }
  ],
  "job": [
    {
      "type": "path",
      "d": "M14 3v4a1 1 0 0 0 1 1h4"
    },
    {
      "type": "path",
      "d": "M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2"
    },
    {
      "type": "path",
      "d": "M9 17h6"
    },
    {
      "type": "path",
      "d": "M9 13h6"
    }
  ],
  "backspace": [
    {
      "type": "path",
      "d": "M20 6a1 1 0 0 1 1 1v10a1 1 0 0 1 -1 1h-11l-5 -5a1.5 1.5 0 0 1 0 -2l5 -5l11 0"
    },
    {
      "type": "path",
      "d": "M12 10l4 4m0 -4l-4 4"
    }
  ],
  "sliders": [
    {
      "type": "path",
      "d": "M12 6a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"
    },
    {
      "type": "path",
      "d": "M4 6l8 0"
    },
    {
      "type": "path",
      "d": "M16 6l4 0"
    },
    {
      "type": "path",
      "d": "M6 12a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"
    },
    {
      "type": "path",
      "d": "M4 12l2 0"
    },
    {
      "type": "path",
      "d": "M10 12l10 0"
    },
    {
      "type": "path",
      "d": "M15 18a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"
    },
    {
      "type": "path",
      "d": "M4 18l11 0"
    },
    {
      "type": "path",
      "d": "M19 18l1 0"
    }
  ],
  "globe": [
    {
      "type": "path",
      "d": "M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0"
    },
    {
      "type": "path",
      "d": "M3.6 9h16.8"
    },
    {
      "type": "path",
      "d": "M3.6 15h16.8"
    },
    {
      "type": "path",
      "d": "M11.5 3a17 17 0 0 0 0 18"
    },
    {
      "type": "path",
      "d": "M12.5 3a17 17 0 0 1 0 18"
    }
  ],
  "star": [
    {
      "type": "path",
      "d": "M12 17.75l-6.172 3.245l1.179 -6.873l-5 -4.867l6.9 -1l3.086 -6.253l3.086 6.253l6.9 1l-5 4.867l1.179 6.873l-6.158 -3.245"
    }
  ],
  "starF": [
    {
      "type": "path",
      "d": "M8.243 7.34l-6.38 .925l-.113 .023a1 1 0 0 0 -.44 1.684l4.622 4.499l-1.09 6.355l-.013 .11a1 1 0 0 0 1.464 .944l5.706 -3l5.693 3l.1 .046a1 1 0 0 0 1.352 -1.1l-1.091 -6.355l4.624 -4.5l.078 -.085a1 1 0 0 0 -.633 -1.62l-6.38 -.926l-2.852 -5.78a1 1 0 0 0 -1.794 0l-2.853 5.78z"
    }
  ],
  "type": [
    {
      "type": "path",
      "d": "M3 7v-2h13v2"
    },
    {
      "type": "path",
      "d": "M10 5v14"
    },
    {
      "type": "path",
      "d": "M12 19h-4"
    },
    {
      "type": "path",
      "d": "M15 13v-1h6v1"
    },
    {
      "type": "path",
      "d": "M18 12v7"
    },
    {
      "type": "path",
      "d": "M17 19h2"
    }
  ],
  "download": [
    {
      "type": "path",
      "d": "M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2"
    },
    {
      "type": "path",
      "d": "M7 11l5 5l5 -5"
    },
    {
      "type": "path",
      "d": "M12 4l0 12"
    }
  ],
  "ban": [
    {
      "type": "path",
      "d": "M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"
    },
    {
      "type": "path",
      "d": "M5.7 5.7l12.6 12.6"
    }
  ],
  "undo": [
    {
      "type": "path",
      "d": "M9 14l-4 -4l4 -4"
    },
    {
      "type": "path",
      "d": "M5 10h11a4 4 0 1 1 0 8h-1"
    }
  ],
  "target": [
    {
      "type": "path",
      "d": "M11 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"
    },
    {
      "type": "path",
      "d": "M7 12a5 5 0 1 0 10 0a5 5 0 1 0 -10 0"
    },
    {
      "type": "path",
      "d": "M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"
    }
  ],
  "share": [
    {
      "type": "path",
      "d": "M3 12a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"
    },
    {
      "type": "path",
      "d": "M15 6a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"
    },
    {
      "type": "path",
      "d": "M15 18a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"
    },
    {
      "type": "path",
      "d": "M8.7 10.7l6.6 -3.4"
    },
    {
      "type": "path",
      "d": "M8.7 13.3l6.6 3.4"
    }
  ],
  "spool": [
    {
      "type": "path",
      "d": "M3 21c-.667 -.667 3.262 -6.236 11.785 -16.709a3.5 3.5 0 1 1 5.078 4.791c-10.575 8.612 -16.196 12.585 -16.863 11.918"
    },
    {
      "type": "path",
      "d": "M17.5 6.5l-1 1"
    },
    {
      "type": "path",
      "d": "M17 7c-2.333 -2.667 -3.5 -4 -5 -4s-2 1 -2 2c0 4 8.161 8.406 6 11c-1.056 1.268 -3.363 1.285 -5.75 .808"
    },
    {
      "type": "path",
      "d": "M5.739 15.425c-1.393 -.565 -3.739 -1.925 -3.739 -3.425"
    },
    {
      "type": "path",
      "d": "M19.5 9.5l1.5 1.5"
    }
  ],
  "report": [
    {
      "type": "path",
      "d": "M9 5h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2h-2"
    },
    {
      "type": "path",
      "d": "M9 5a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2"
    },
    {
      "type": "path",
      "d": "M9 17v-5"
    },
    {
      "type": "path",
      "d": "M12 17v-1"
    },
    {
      "type": "path",
      "d": "M15 17v-3"
    }
  ],
  "needle": [
    {
      "type": "path",
      "d": "M3 21c-.667 -.667 3.262 -6.236 11.785 -16.709a3.5 3.5 0 1 1 5.078 4.791c-10.575 8.612 -16.196 12.585 -16.863 11.918"
    },
    {
      "type": "path",
      "d": "M17.5 6.5l-1 1"
    }
  ],
  "hanger": [
    {
      "type": "path",
      "d": "M14 6a2 2 0 1 0 -4 0c0 1.667 .67 3 2 4h-.008l7.971 4.428a2 2 0 0 1 1.029 1.749v.823a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-.823a2 2 0 0 1 1.029 -1.749l7.971 -4.428"
    }
  ],
  "userPlus": [
    {
      "type": "path",
      "d": "M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0"
    },
    {
      "type": "path",
      "d": "M16 19h6"
    },
    {
      "type": "path",
      "d": "M19 16v6"
    },
    {
      "type": "path",
      "d": "M6 21v-2a4 4 0 0 1 4 -4h4"
    }
  ],
  "package": [
    {
      "type": "path",
      "d": "M12 3l8 4.5l0 9l-8 4.5l-8 -4.5l0 -9l8 -4.5"
    },
    {
      "type": "path",
      "d": "M12 12l8 -4.5"
    },
    {
      "type": "path",
      "d": "M12 12l0 9"
    },
    {
      "type": "path",
      "d": "M12 12l-8 -4.5"
    },
    {
      "type": "path",
      "d": "M16 5.25l-8 4.5"
    }
  ],
  "cash": [
    {
      "type": "path",
      "d": "M7 15h-3a1 1 0 0 1 -1 -1v-8a1 1 0 0 1 1 -1h12a1 1 0 0 1 1 1v3"
    },
    {
      "type": "path",
      "d": "M7 10a1 1 0 0 1 1 -1h12a1 1 0 0 1 1 1v8a1 1 0 0 1 -1 1h-12a1 1 0 0 1 -1 -1l0 -8"
    },
    {
      "type": "path",
      "d": "M12 14a2 2 0 1 0 4 0a2 2 0 0 0 -4 0"
    }
  ],
  "truck": [
    {
      "type": "path",
      "d": "M5 17a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"
    },
    {
      "type": "path",
      "d": "M15 17a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"
    },
    {
      "type": "path",
      "d": "M5 17h-2v-4m-1 -8h11v12m-4 0h6m4 0h2v-6h-8m0 -5h5l3 5"
    },
    {
      "type": "path",
      "d": "M3 9l4 0"
    }
  ],
  "sparkle": [
    {
      "type": "path",
      "d": "M16 18a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2m0 -12a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2m-7 12a6 6 0 0 1 6 -6a6 6 0 0 1 -6 -6a6 6 0 0 1 -6 6a6 6 0 0 1 6 6"
    }
  ],
  "dots": [
    {
      "type": "path",
      "d": "M4 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"
    },
    {
      "type": "path",
      "d": "M11 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"
    },
    {
      "type": "path",
      "d": "M18 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"
    }
  ],
  "filter": [
    {
      "type": "path",
      "d": "M4 4h16v2.172a2 2 0 0 1 -.586 1.414l-4.414 4.414v7l-6 2v-8.5l-4.48 -4.928a2 2 0 0 1 -.52 -1.345v-2.227"
    }
  ],
  "logout": [
    {
      "type": "path",
      "d": "M14 8v-2a2 2 0 0 0 -2 -2h-7a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2 -2v-2"
    },
    {
      "type": "path",
      "d": "M9 12h12l-3 -3"
    },
    {
      "type": "path",
      "d": "M18 15l3 -3"
    }
  ],
  "palette": [
    {
      "type": "path",
      "d": "M12 21a9 9 0 0 1 0 -18c4.97 0 9 3.582 9 8c0 1.06 -.474 2.078 -1.318 2.828c-.844 .75 -1.989 1.172 -3.182 1.172h-2.5a2 2 0 0 0 -1 3.75a1.3 1.3 0 0 1 -1 2.25"
    },
    {
      "type": "path",
      "d": "M7.5 10.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"
    },
    {
      "type": "path",
      "d": "M11.5 7.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"
    },
    {
      "type": "path",
      "d": "M15.5 10.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"
    }
  ],
  "language": [
    {
      "type": "path",
      "d": "M9 6.371c0 4.418 -2.239 6.629 -5 6.629"
    },
    {
      "type": "path",
      "d": "M4 6.371h7"
    },
    {
      "type": "path",
      "d": "M5 9c0 2.144 2.252 3.908 6 4"
    },
    {
      "type": "path",
      "d": "M12 20l4 -9l4 9"
    },
    {
      "type": "path",
      "d": "M19.1 18h-6.2"
    },
    {
      "type": "path",
      "d": "M6.694 3l.793 .582"
    }
  ],
  "cloudOff": [
    { "type": "path", "d": "M7 18a4.6 4.4 0 0 1 0 -9a5 4.5 0 0 1 11 2h1a3.5 3.5 0 0 1 0 7h-1" },
    { "type": "path", "d": "M3 3l18 18" }
  ],
  "refresh": [
    { "type": "path", "d": "M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4" },
    { "type": "path", "d": "M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4" }
  ],
  "cloud": [
    {
      "type": "path",
      "d": "M7 18a4.6 4.4 0 0 1 0 -9a5 4.5 0 0 1 11 2h1a3.5 3.5 0 0 1 0 7h-1"
    },
    {
      "type": "path",
      "d": "M9 15l3 -3l3 3"
    },
    {
      "type": "path",
      "d": "M12 12l0 9"
    }
  ],
  "shield": [
    {
      "type": "path",
      "d": "M12 3a12 12 0 0 0 8.5 3a12 12 0 0 1 -8.5 15a12 12 0 0 1 -8.5 -15a12 12 0 0 0 8.5 -3"
    },
    {
      "type": "path",
      "d": "M11 11a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"
    },
    {
      "type": "path",
      "d": "M12 12l0 2.5"
    }
  ],
  "flame": [
    {
      "type": "path",
      "d": "M12 10.941c2.333 -3.308 .167 -7.823 -1 -8.941c0 3.395 -2.235 5.299 -3.667 6.706c-1.43 1.408 -2.333 3.294 -2.333 5.588c0 3.704 3.134 6.706 7 6.706c3.866 0 7 -3.002 7 -6.706c0 -1.712 -1.232 -4.403 -2.333 -5.588c-2.084 3.353 -3.257 3.353 -4.667 2.235"
    }
  ],
  "progress": [
    {
      "type": "path",
      "d": "M10 20.777a8.942 8.942 0 0 1 -2.48 -.969"
    },
    {
      "type": "path",
      "d": "M14 3.223a9.003 9.003 0 0 1 0 17.554"
    },
    {
      "type": "path",
      "d": "M4.579 17.093a8.961 8.961 0 0 1 -1.227 -2.592"
    },
    {
      "type": "path",
      "d": "M3.124 10.5c.16 -.95 .468 -1.85 .9 -2.675l.169 -.305"
    },
    {
      "type": "path",
      "d": "M6.907 4.579a8.954 8.954 0 0 1 3.093 -1.356"
    }
  ],
  "circleCheck": [
    {
      "type": "path",
      "d": "M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"
    },
    {
      "type": "path",
      "d": "M9 12l2 2l4 -4"
    }
  ],
  "hourglass": [
    {
      "type": "path",
      "d": "M6.5 7h11"
    },
    {
      "type": "path",
      "d": "M6.5 17h11"
    },
    {
      "type": "path",
      "d": "M6 20v-2a6 6 0 1 1 12 0v2a1 1 0 0 1 -1 1h-10a1 1 0 0 1 -1 -1"
    },
    {
      "type": "path",
      "d": "M6 4v2a6 6 0 1 0 12 0v-2a1 1 0 0 0 -1 -1h-10a1 1 0 0 0 -1 1"
    }
  ],
  "photo": [
    {
      "type": "path",
      "d": "M15 8h.01"
    },
    {
      "type": "path",
      "d": "M3 6a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v12a3 3 0 0 1 -3 3h-12a3 3 0 0 1 -3 -3v-12"
    },
    {
      "type": "path",
      "d": "M3 16l5 -5c.928 -.893 2.072 -.893 3 0l5 5"
    },
    {
      "type": "path",
      "d": "M14 14l1 -1c.928 -.893 2.072 -.893 3 0l3 3"
    }
  ],
  "note": [
    {
      "type": "path",
      "d": "M5 5a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2l0 -14"
    },
    {
      "type": "path",
      "d": "M9 7l6 0"
    },
    {
      "type": "path",
      "d": "M9 11l6 0"
    },
    {
      "type": "path",
      "d": "M9 15l4 0"
    }
  ],
  "building": [
    {
      "type": "path",
      "d": "M3 21l18 0"
    },
    {
      "type": "path",
      "d": "M3 7v1a3 3 0 0 0 6 0v-1m0 1a3 3 0 0 0 6 0v-1m0 1a3 3 0 0 0 6 0v-1h-18l2 -4h14l2 4"
    },
    {
      "type": "path",
      "d": "M5 21l0 -10.15"
    },
    {
      "type": "path",
      "d": "M19 21l0 -10.15"
    },
    {
      "type": "path",
      "d": "M9 21v-4a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v4"
    }
  ],
  "calendarEvent": [
    {
      "type": "path",
      "d": "M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2l0 -12"
    },
    {
      "type": "path",
      "d": "M16 3l0 4"
    },
    {
      "type": "path",
      "d": "M8 3l0 4"
    },
    {
      "type": "path",
      "d": "M4 11l16 0"
    },
    {
      "type": "path",
      "d": "M8 15h2v2h-2l0 -2"
    }
  ],
  "coin": [
    {
      "type": "path",
      "d": "M9 14c0 1.657 2.686 3 6 3s6 -1.343 6 -3s-2.686 -3 -6 -3s-6 1.343 -6 3"
    },
    {
      "type": "path",
      "d": "M9 14v4c0 1.656 2.686 3 6 3s6 -1.344 6 -3v-4"
    },
    {
      "type": "path",
      "d": "M3 6c0 1.072 1.144 2.062 3 2.598s4.144 .536 6 0c1.856 -.536 3 -1.526 3 -2.598c0 -1.072 -1.144 -2.062 -3 -2.598s-4.144 -.536 -6 0c-1.856 .536 -3 1.526 -3 2.598"
    },
    {
      "type": "path",
      "d": "M3 6v10c0 .888 .772 1.45 2 2"
    },
    {
      "type": "path",
      "d": "M3 11c0 .888 .772 1.45 2 2"
    }
  ],
  "chevD": [
    {
      "type": "path",
      "d": "M6 9l6 6l6 -6"
    }
  ],
  "eye": [
    {
      "type": "path",
      "d": "M10 12a2 2 0 1 0 4 0a2 2 0 0 0 -4 0"
    },
    {
      "type": "path",
      "d": "M21 12c-2.4 4 -5.4 6 -9 6c-3.6 0 -6.6 -2 -9 -6c2.4 -4 5.4 -6 9 -6c3.6 0 6.6 2 9 6"
    }
  ],
  "eyeOff": [
    {
      "type": "path",
      "d": "M10.585 10.587a2 2 0 0 0 2.829 2.828"
    },
    {
      "type": "path",
      "d": "M16.681 16.673a8.717 8.717 0 0 1 -4.681 1.327c-3.6 0 -6.6 -2 -9 -6c1.272 -2.12 2.712 -3.678 4.32 -4.674m2.86 -1.146a9.055 9.055 0 0 1 1.82 -.18c3.6 0 6.6 2 9 6c-.666 1.11 -1.379 2.067 -2.138 2.87"
    },
    {
      "type": "path",
      "d": "M3 3l18 18"
    }
  ],
  "info": [
    {
      "type": "path",
      "d": "M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0"
    },
    {
      "type": "path",
      "d": "M12 9h.01"
    },
    {
      "type": "path",
      "d": "M11 12h1v4h1"
    }
  ]
};

// Screens use a mix of Tabler/FontAwesome-style kebab names; map them onto the
// glyphs above so they don't silently fall back to the "alert" icon.
const ICON_ALIASES: Record<string, string> = {
  'brand-whatsapp': 'chat',
  'whatsapp': 'chat',
  'shirt': 'tag',
  'chevron-right': 'chev',
  'chevron-left': 'chevL',
  'chevron-down': 'chevD',
  'microphone': 'mic',
  'clipboard-list': 'orders',
  'calendar-alt': 'calendar',
  'currency-rupee': 'rupee',
  'ruler-measure': 'ruler',
  'ruler-combined': 'ruler',
  'user-plus': 'userPlus',
  'user-check': 'userCheck',
  'user-friends': 'users',
  'chart-bar': 'chart',
  'sparkles': 'sparkle',
  'eye-off': 'eyeOff',
  'info-circle': 'info',
  'circle-check': 'circleCheck',
  'arrow-right': 'arrowR',
  'arrow-left': 'arrowL',
};

export function Icon({
  name,
  size = 20,
  color,
  strokeWidth = 2,
  style,
}: IconProps) {
  const { colors } = useTheme();
  const iconColor = color || colors.iconDefault;
  const elements = TABLER_ICONS[name] || TABLER_ICONS[ICON_ALIASES[name]] || TABLER_ICONS['alert'] || [];
  if (__DEV__ && !TABLER_ICONS[name] && !ICON_ALIASES[name]) {
    console.warn(`[Icon] Unknown icon name "${name}"`);
  }

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={iconColor}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      {elements.map((el, i) => {
        if (el.type === 'path') {
          return <Path key={i} d={el.d} stroke={iconColor} strokeWidth={strokeWidth} fill="none" />;
        }
        if (el.type === 'circle') {
          return <Circle key={i} cx={el.cx} cy={el.cy} r={el.r} stroke={iconColor} strokeWidth={strokeWidth} fill="none" />;
        }
        if (el.type === 'rect') {
          return <Rect key={i} x={el.x} y={el.y} width={el.width} height={el.height} rx={el.rx || 0} stroke={iconColor} strokeWidth={strokeWidth} fill="none" />;
        }
        if (el.type === 'line') {
          return <Line key={i} x1={el.x1} y1={el.y1} x2={el.x2} y2={el.y2} stroke={iconColor} strokeWidth={strokeWidth} />;
        }
        return null;
      })}
    </Svg>
  );
}

export function LogoMark({ size = 28, color }: { size?: number; color?: string }) {
  const { colors } = useTheme();
  const fill = color || colors.primary;
  return (
    <Svg width={size} height={size} viewBox="250 256 755 755">
      <Path
        d="M420 370H942Q958 370 958 386V410C958 462 918 505 868 505H668C624 505 588 541 588 585V812C588 859 551 897 505 897H472Q455 897 455 880V522H313Q297 522 297 506V494C297 426 352 370 420 370Z"
        fill={fill}
      />
      <Path
        d="M678 555H915Q932 555 932 572V590C932 646 886 692 830 692H770Q762 692 762 700V790C762 849 714 897 655 897Q638 897 638 880V595C638 573 656 555 678 555Z"
        fill={fill}
      />
    </Svg>
  );
}

