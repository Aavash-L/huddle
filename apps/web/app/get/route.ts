import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type Platform = 'ios' | 'android' | 'mac' | 'windows' | 'other';

function detectPlatform(ua: string): Platform {
  const u = ua.toLowerCase();
  if (/iphone|ipad|ipod/.test(u)) return 'ios';
  if (/android/.test(u)) return 'android';
  // macOS: "Macintosh" appears in desktop Safari/Chrome UA; exclude "iphone" already handled
  if (/macintosh|mac os x/.test(u) && !/windows/.test(u)) return 'mac';
  if (/windows nt|win64|win32/.test(u)) return 'windows';
  return 'other';
}

export function GET(request: NextRequest) {
  const ua = request.headers.get('user-agent') ?? '';
  const platform = detectPlatform(ua);

  const iosUrl = process.env.NEXT_PUBLIC_IOS_URL ?? '';
  const androidUrl = process.env.NEXT_PUBLIC_ANDROID_URL ?? '';
  const macUrl = process.env.NEXT_PUBLIC_MAC_DMG_URL ?? '';
  const windowsUrl = process.env.NEXT_PUBLIC_WINDOWS_URL ?? '';
  const webUrl = process.env.NEXT_PUBLIC_WEB_APP_URL ?? '';

  let target: string;
  switch (platform) {
    case 'ios':
      target = iosUrl || webUrl || '/';
      break;
    case 'android':
      target = androidUrl || webUrl || '/';
      break;
    case 'mac':
      // Mac visitors: prefer the .dmg; fall back to web app, then marketing site
      target = macUrl || webUrl || '/';
      break;
    case 'windows':
      target = windowsUrl || webUrl || '/';
      break;
    default:
      target = webUrl || '/';
      break;
  }

  // Pass through incoming search params (UTMs etc.)
  const incoming = request.nextUrl.searchParams;
  const isAbsolute = /^https?:\/\//i.test(target);

  if (isAbsolute) {
    const url = new URL(target);
    incoming.forEach((value, key) => {
      if (!url.searchParams.has(key)) url.searchParams.set(key, value);
    });
    return NextResponse.redirect(url.toString(), 302);
  }

  const url = new URL(target, request.nextUrl.origin);
  incoming.forEach((value, key) => {
    if (!url.searchParams.has(key)) url.searchParams.set(key, value);
  });
  return NextResponse.redirect(url.toString(), 302);
}
