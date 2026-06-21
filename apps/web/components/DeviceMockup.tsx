const PEOPLE = [
  { name: 'Alex', initial: 'A', color: '#F5B544' },
  { name: 'Sam', initial: 'S', color: '#6BA8F5' },
  { name: 'Mia', initial: 'M', color: '#F56B9B' },
  { name: 'Jordan', initial: 'J', color: '#7BD88F' },
];

export default function DeviceMockup() {
  return (
    <>
      <style>{`
        @keyframes huddle-float {
          from { transform: translateY(0); }
          to { transform: translateY(-8px); }
        }
        .huddle-device {
          animation: huddle-float 3s ease-in-out infinite alternate;
        }
      `}</style>
      <div
        className="huddle-device"
        style={{
          width: 280,
          padding: 12,
          borderRadius: 44,
          background: '#05080C',
          border: '1px solid rgba(255,255,255,0.10)',
          boxShadow: '0 30px 80px -20px rgba(0,0,0,0.8)',
        }}
      >
        <div
          style={{
            borderRadius: 34,
            overflow: 'hidden',
            background: '#0A0E14',
            position: 'relative',
          }}
        >
          {/* notch */}
          <div
            style={{
              position: 'absolute',
              top: 8,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 90,
              height: 22,
              borderRadius: 12,
              background: '#05080C',
              zIndex: 2,
            }}
          />
          <div style={{ padding: '40px 16px 22px' }}>
            <div
              style={{
                borderRadius: 22,
                background: '#121823',
                border: '1px solid rgba(255,255,255,0.08)',
                padding: 18,
              }}
            >
              <div style={{ fontSize: 11, color: '#9AA6B8', marginBottom: 6 }}>
                Plan
              </div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: '#F4F6FB',
                  lineHeight: 1.25,
                  fontFamily: 'var(--font-display)',
                }}
              >
                Dinner at that new ramen place
              </div>

              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  marginTop: 12,
                  padding: '6px 10px',
                  borderRadius: 999,
                  background: 'rgba(245,181,68,0.12)',
                  color: '#F5B544',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                🔒 Locked · Thursday 8pm
              </div>

              <div style={{ display: 'flex', alignItems: 'center', marginTop: 16 }}>
                {PEOPLE.map((p, i) => (
                  <div
                    key={p.name}
                    title={p.name}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 999,
                      background: p.color,
                      color: '#0A0E14',
                      fontSize: 13,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid #121823',
                      marginLeft: i === 0 ? 0 : -8,
                    }}
                  >
                    {p.initial}
                  </div>
                ))}
                <span style={{ marginLeft: 12, fontSize: 13, color: '#9AA6B8' }}>
                  In: <span style={{ color: '#7BD88F', fontWeight: 700 }}>3</span>/4
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
