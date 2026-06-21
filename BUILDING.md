# Building Huddle Desktop

## Prerequisites

### 1. Install Rust
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"
# Add Apple Silicon + Intel targets for universal macOS binary
rustup target add aarch64-apple-darwin x86_64-apple-darwin
```

### 2. Install Tauri CLI
```bash
pnpm --filter @huddle/desktop add -D @tauri-apps/cli
# or globally:
cargo install tauri-cli
```

### 3. Install platform toolchains (macOS)
Xcode Command Line Tools are required:
```bash
xcode-select --install
```

### 4. Build the Expo web bundle first
```bash
cd apps/mobile
npx expo export --platform web
# Output lands in apps/mobile/dist/
```

## Local development

```bash
cd apps/desktop
pnpm tauri dev   # Opens the app in a Tauri window pointing at the web bundle
```

## Local production build (macOS .dmg)

```bash
# Build universal binary (Intel + Apple Silicon)
cd apps/desktop
pnpm tauri build --target universal-apple-darwin
# Output: apps/desktop/src-tauri/target/universal-apple-darwin/release/bundle/dmg/Huddle*.dmg
```

## Windows build (.msi + .exe)

Windows builds must run on a Windows machine or the `windows-latest` GitHub Actions runner:
```powershell
cd apps\desktop
pnpm tauri build
# Output: apps\desktop\src-tauri\target\release\bundle\msi\Huddle*.msi
#         apps\desktop\src-tauri\target\release\bundle\nsis\Huddle*-setup.exe
```

## Code signing + notarization (macOS)

Set these environment variables before running `tauri build`:
```
APPLE_CERTIFICATE          # base64-encoded Developer ID Application .p12
APPLE_CERTIFICATE_PASSWORD # p12 password
APPLE_ID                   # your Apple ID email
APPLE_PASSWORD             # app-specific password from appleid.apple.com
APPLE_TEAM_ID              # 10-char Team ID from developer.apple.com
```

Tauri 2's bundler handles codesigning and notarytool automatically when these are set.

## Updater signing keypair

Generate once and store the private key as a CI secret:
```bash
pnpm tauri signer generate -w ~/.tauri/huddle.key
# Prints the public key — paste it into tauri.conf.json > bundle.updater.pubkey
# Store the private key value in the TAURI_SIGNING_PRIVATE_KEY CI secret
```

## Required CI secrets

See `.github/SECRETS.md` for the full list.
