# Huddle for Mac — Build & Install Guide

## Opening the unsigned beta (one-time Gatekeeper step)

macOS will block the app on first launch because it is unsigned. Two options:

**Option A — right-click open:**
1. Double-click the `.dmg` to mount it.
2. Drag `Huddle.app` to your Applications folder.
3. In Finder, right-click `Huddle.app` → **Open**.
4. Click **Open** in the dialog. macOS remembers this choice.

**Option B — quarantine flag:**
```bash
xattr -dr com.apple.quarantine /Applications/Huddle.app
```

**Option C — System Settings:**
System Settings → Privacy & Security → scroll to "Huddle was blocked" → **Open Anyway**.

---

## Rebuilding the .dmg

**Prerequisites (one-time):**
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source "$HOME/.cargo/env"
rustup target add aarch64-apple-darwin x86_64-apple-darwin
brew install create-dmg
```

**Rebuild steps:**

1. Rebuild the Expo web frontend:
   ```bash
   cd apps/mobile
   npx expo export --platform web
   ```

2. Build the universal Mac .dmg:
   ```bash
   cd apps/desktop
   PATH="$HOME/.cargo/bin:$PATH" npx --yes pnpm@9.15.4 tauri build --target universal-apple-darwin
   ```

3. Output: `apps/desktop/src-tauri/target/universal-apple-darwin/release/bundle/dmg/Huddle_<version>_universal.dmg`

---

## Cutting a new GitHub Release

```bash
VERSION="v0.2.0"
DMG="apps/desktop/src-tauri/target/universal-apple-darwin/release/bundle/dmg/Huddle_1.0.0_universal.dmg"

gh release create "$VERSION" "$DMG" \
  --repo Aavash-L/huddle \
  --title "Huddle for Mac $VERSION" \
  --notes "Unsigned beta build." \
  --prerelease
```

Then update `NEXT_PUBLIC_MAC_DMG_URL` in Vercel to point at the new asset URL:
`https://github.com/Aavash-L/huddle/releases/download/<tag>/Huddle_<version>_universal.dmg`

---

## Updating the version number

Change `version` in `apps/desktop/src-tauri/tauri.conf.json` before building.
The `.dmg` filename will reflect the new version automatically.
