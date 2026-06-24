# App Icon Setup

## Icon Files Needed

Place these files in `assets/icons/`:

| File | Size | Description |
|------|------|-------------|
| `app_icon.png` | 1024×1024 | Full icon (used for iOS + Android legacy) |
| `app_icon_foreground.png` | 1024×1024 | Foreground layer for Android adaptive icon (the "T" letter, centered in 72dp safe zone) |

**Design spec:**
- Background: `#0D1117` (deep dark)
- Foreground: "T" lettermark in Orbitron ExtraBold, color `#007BFF` (blue), with a subtle radial glow
- Or use a simple gradient square with rounded corners and a large "T"

## Generate Icons

```bash
cd mobile
flutter pub get
dart run flutter_launcher_icons
```

This generates all required icon sizes for Android `mipmap-*` and iOS `AppIcon.appiconset`.

## Quick placeholder (no design tool)

If you just want to test with a solid blue icon, create a 1024×1024 PNG with background `#007BFF` and save as both `app_icon.png` and `app_icon_foreground.png`. You can use any online PNG generator.

## Splash screen

For a native splash screen (shown before Flutter renders), use `flutter_native_splash`:

```yaml
# Add to pubspec.yaml dev_dependencies:
flutter_native_splash: ^2.4.1
```

```yaml
# Add to pubspec.yaml root:
flutter_native_splash:
  color: "#0D1117"
  image: assets/icons/app_icon.png
  android_12:
    image: assets/icons/app_icon_foreground.png
    color: "#0D1117"
```

```bash
dart run flutter_native_splash:create
```
