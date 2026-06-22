import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

// This file controls the HTML shell baked into every `expo export`.
// Changes here survive rebuilds — never patch dist/index.html by hand.
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <title>Huddle</title>
        <meta name="theme-color" content="#0A0E14" />
        {/* expo-router recommended reset */}
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body { height: 100%; margin: 0; background: #0A0E14; }
              body { overflow: hidden; display: flex; align-items: stretch; }
              #root { display: flex; flex: 1; height: 100%; width: 100%; position: relative; overflow: hidden; }
              * { box-sizing: border-box; }
              ::-webkit-scrollbar { width: 6px; height: 6px; }
              ::-webkit-scrollbar-track { background: transparent; }
              ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 3px; }
              ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.22); }
            `,
          }}
        />
      </head>
      <body style={{ backgroundColor: '#0A0E14' }}>
        {children}
      </body>
    </html>
  );
}
