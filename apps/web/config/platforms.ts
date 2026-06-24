export interface PlatformConfig {
  url: string;
  enabled: boolean;
  label: string;
  sublabel: string;
}

const IOS_URL = process.env.NEXT_PUBLIC_IOS_URL ?? '';
const ANDROID_URL = process.env.NEXT_PUBLIC_ANDROID_URL ?? '';
// Mac: GitHub Release .dmg (universal Apple Silicon + Intel)
const MAC_DMG_URL = process.env.NEXT_PUBLIC_MAC_DMG_URL ?? '';
// Windows: GitHub Release .msi/.exe
const WINDOWS_URL = process.env.NEXT_PUBLIC_WINDOWS_URL ?? '';
const WEB_APP_URL = process.env.NEXT_PUBLIC_WEB_APP_URL ?? 'https://huddle-web-lyart.vercel.app';

export const PLATFORMS: Record<'ios' | 'android' | 'mac' | 'windows' | 'web', PlatformConfig> = {
  ios: {
    url: IOS_URL,
    enabled: IOS_URL.length > 0,
    label: 'Download for iPhone',
    sublabel: 'iOS 16+',
  },
  android: {
    url: ANDROID_URL,
    enabled: ANDROID_URL.length > 0,
    label: 'Get it on Android',
    sublabel: 'Android 8+',
  },
  mac: {
    url: MAC_DMG_URL,
    enabled: MAC_DMG_URL.length > 0,
    label: 'Download for Mac',
    sublabel: 'Apple Silicon + Intel · macOS 10.15+',
  },
  windows: {
    url: WINDOWS_URL,
    enabled: WINDOWS_URL.length > 0,
    label: 'Download for Windows',
    sublabel: 'Windows 10+',
  },
  web: {
    url: WEB_APP_URL,
    enabled: WEB_APP_URL.length > 0,
    label: 'Open Huddle on the web',
    sublabel: 'Any browser, any device',
  },
};

export const SMART_DOWNLOAD_URL = '/get';

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://huddle.app';
