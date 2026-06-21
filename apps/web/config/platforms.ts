export interface PlatformConfig {
  url: string;
  enabled: boolean;
  label: string;
  sublabel: string;
}

const IOS_URL = process.env.NEXT_PUBLIC_IOS_URL ?? '';
const ANDROID_URL = process.env.NEXT_PUBLIC_ANDROID_URL ?? '';
const MAC_URL = process.env.NEXT_PUBLIC_MAC_URL ?? '';
const WEB_APP_URL = process.env.NEXT_PUBLIC_WEB_APP_URL ?? '';

export const PLATFORMS: Record<'ios' | 'android' | 'mac' | 'web', PlatformConfig> = {
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
    url: MAC_URL,
    enabled: MAC_URL.length > 0,
    label: 'Also on Mac',
    sublabel: 'Runs on Apple Silicon via iPad',
  },
  web: {
    url: WEB_APP_URL,
    enabled: WEB_APP_URL.length > 0,
    label: 'Use Huddle on the web',
    sublabel: 'Any browser, any device',
  },
};

export const SMART_DOWNLOAD_URL = '/get';

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://huddle.app';
