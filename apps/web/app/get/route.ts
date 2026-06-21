import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function detectPlatform(ua: string): 'ios' | 'android' | 'mac' | 'other' {
  const u = ua.toLowerCase();
  if (/iphone|ipad|ipod/.test(u)) return 'ios';
  if (/android/.test(u)) return 'android';
  if (/macintosh|mac os x/.test(u)) return 'mac';
  return 'other';
}

export function GET(request: NextRequest) {
  const ua = request.headers.get('user-agent') ?? '';
  const platform = detectPlatform(ua);

  const iosUrl = process.env.NEXT_PUBLIC_IOS_URL ?? '';
  const androidUrl = process.env.NEXT_PUBLIC_ANDROID_URL ?? '';
  const macUrl = process.env.NEXT_PUBLIC_MAC_URL ?? '';
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
      target = macUrl || iosUrl || '/';
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

  // Relative target — resolve against the current origin.
  const url = new URL(target, request.nextUrl.origin);
  incoming.forEach((value, key) => {
    if (!url.searchParams.has(key)) url.searchParams.set(key, value);
  });
  return NextResponse.redirect(url.toString(), 302);
}
