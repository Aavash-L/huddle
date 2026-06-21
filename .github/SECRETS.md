# Required CI Secrets for Desktop Release

Set all of these in **GitHub → Repository Settings → Secrets and Variables → Actions**.

## macOS Code Signing + Notarization

| Secret | How to get it |
|--------|--------------|
| `APPLE_CERTIFICATE` | Base64-encoded Developer ID Application .p12 file: `base64 -i cert.p12 \| pbcopy` |
| `APPLE_CERTIFICATE_PASSWORD` | Password you set when exporting the .p12 from Keychain Access |
| `KEYCHAIN_PASSWORD` | Any strong random string — used only during the CI build |
| `APPLE_ID` | Your Apple ID email (e.g. `you@example.com`) |
| `APPLE_PASSWORD` | App-specific password from [appleid.apple.com](https://appleid.apple.com) → Sign-In and Security → App-Specific Passwords |
| `APPLE_TEAM_ID` | 10-character Team ID from [developer.apple.com/account](https://developer.apple.com/account) → Membership |

### Getting the Developer ID Application cert

1. Open Xcode → Settings → Accounts → Manage Certificates
2. Click **+** → **Developer ID Application**
3. Right-click the new cert in Keychain Access → Export → save as `.p12`
4. `base64 -i /path/to/cert.p12 | pbcopy` and paste as `APPLE_CERTIFICATE`

## Tauri Updater Signing

| Secret | How to get it |
|--------|--------------|
| `TAURI_SIGNING_PRIVATE_KEY` | Generated via `pnpm tauri signer generate -w ~/.tauri/huddle.key` — use the private key value printed |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | The password you chose during key generation (can be empty) |

After generating, paste the **public key** into `apps/desktop/src-tauri/tauri.conf.json`:
```json
"bundle": {
  "updater": {
    "pubkey": "PASTE_PUBLIC_KEY_HERE"
  }
}
```

## Windows Code Signing (optional)

Without a signing cert, Windows will show a SmartScreen warning ("Windows protected your PC") on first launch. Users can still install by clicking "More info → Run anyway".

| Secret | How to get it |
|--------|--------------|
| `WINDOWS_CERTIFICATE` | Base64-encoded Authenticode .pfx file (requires purchasing an EV or OV cert from DigiCert, Sectigo, etc.) |
| `WINDOWS_CERTIFICATE_PASSWORD` | .pfx export password |

If you don't have a Windows cert yet, SmartScreen reputation builds up automatically after enough installs. For a new app, this is acceptable — just document it in the release notes.

## Stripe (Phase 5)

| Secret | Where to set |
|--------|-------------|
| `STRIPE_SECRET_KEY` | Vercel Environment Variables → `apps/web` project |
| `STRIPE_WEBHOOK_SECRET` | Vercel Environment Variables → `apps/web` project |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Vercel Environment Variables → `apps/web` project |

## Supabase (already configured)

| Env Var | Where to set |
|---------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel + local `.env.local` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel + local `.env.local` |
| `EXPO_PUBLIC_SUPABASE_URL` | EAS Secrets + local `.env.local` in `apps/mobile` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | EAS Secrets + local `.env.local` in `apps/mobile` |
