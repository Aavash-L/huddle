'use client';

import dynamic from 'next/dynamic';

const QRCodeSVG = dynamic(
  () => import('qrcode.react').then((m) => m.QRCodeSVG),
  { ssr: false }
);

export default function QRCode({
  value,
  size = 180,
}: {
  value: string;
  size?: number;
}) {
  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <QRCodeSVG
        value={value}
        size={size}
        fgColor="#F5B544"
        bgColor="transparent"
        level="M"
      />
      <span
        aria-hidden
        style={{
          position: 'absolute',
          fontSize: size * 0.22,
          lineHeight: 1,
          background: '#0A0E14',
          borderRadius: 8,
          padding: 4,
        }}
      >
        🤝
      </span>
    </div>
  );
}
