import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Huddle — Plans that actually happen';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0A0E14',
          padding: '80px',
        }}
      >
        <div style={{ fontSize: 180, lineHeight: 1 }}>🤝</div>
        <div
          style={{
            fontSize: 110,
            fontWeight: 800,
            color: '#F4F6FB',
            marginTop: 24,
            letterSpacing: '-0.03em',
          }}
        >
          Huddle
        </div>
        <div
          style={{
            fontSize: 44,
            fontWeight: 600,
            color: '#F5B544',
            marginTop: 12,
            textAlign: 'center',
          }}
        >
          Plans go to die in the group chat.
        </div>
      </div>
    ),
    { ...size }
  );
}
