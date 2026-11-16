# PropertyX native mobile builds

PropertyX now includes a Capacitor 8 native container configuration for Android and iOS.

## Requirements
- Node.js 22 or later.
- Capacitor 8.6.2.
- Android: Android Studio 2025.2.1 or later and Android SDK API 36; minimum supported Android platform API 24.
- iOS: macOS with Xcode 26 or later; minimum supported iOS 15.
- iOS signing and App Store distribution require the Apple Developer account's certificates/profiles and App Store Connect access.

## Local developer workflow
1. Copy `.env.example` to `.env.local` and configure the public Supabase URL and publishable key.
2. Run `npm ci`.
3. Generate a native project once: `npm run mobile:add:android` and/or `npm run mobile:add:ios`.
4. Build and sync: `npm run mobile:sync`.
5. Open Android Studio / Xcode with `npm run mobile:open:android` / `npm run mobile:open:ios`.

Native platform directories should be committed after a maintainer reviews the generated project and app identifiers. The mobile CI workflow currently generates projects ephemerally and produces unsigned internal test builds; it does not sign or submit to either store.

## Release gates
- Confirm the unique app identifier `com.propertyxai.marketplace` is owned by PropertyX before store registration.
- Add final Android adaptive icons and iOS App Store icon assets, screenshots and store metadata.
- Configure signing credentials and secure CI secrets; never commit keystores, provisioning profiles or API keys.
- Complete real-device testing for OAuth/deep links, phone/email links, file upload/camera, keyboard, notifications, safe areas, location permissions and offline/recovery behavior.
- Review platform-specific purchase policy before deciding whether any paid digital subscription needs native in-app purchase rather than external checkout.
