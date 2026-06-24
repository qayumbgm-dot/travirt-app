# Native Platform Setup

Run `flutter run` once to generate android/ and ios/ folders, then apply these patches.

## Android — Deep Links (travirt://)

In `android/app/src/main/AndroidManifest.xml`, inside the `<activity>` tag, add:

```xml
<!-- Deep link intent filter for Alice Blue OAuth callback -->
<intent-filter android:label="travirt">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="travirt" />
</intent-filter>
```

Also ensure the activity has `android:launchMode="singleTop"` to prevent duplicate instances.

## iOS — Deep Links (travirt://)

In `ios/Runner/Info.plist`, add:

```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleTypeRole</key>
        <string>Editor</string>
        <key>CFBundleURLName</key>
        <string>com.travirt.app</string>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>travirt</string>
        </array>
    </dict>
</array>
```

## Android — MainActivity.kt patch

In `android/app/src/main/kotlin/.../MainActivity.kt`, override `onNewIntent` to forward deep links to Flutter:

```kotlin
import android.content.Intent
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.EventChannel
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private val deepLinkChannel = "travirt/deeplink"
    private val deepLinkEvents  = "travirt/deeplink/events"
    private var eventSink: EventChannel.EventSink? = null

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, deepLinkChannel)
            .setMethodCallHandler { call, result ->
                if (call.method == "getInitialLink") {
                    result.success(intent?.data?.toString())
                } else {
                    result.notImplemented()
                }
            }

        EventChannel(flutterEngine.dartExecutor.binaryMessenger, deepLinkEvents)
            .setStreamHandler(object : EventChannel.StreamHandler {
                override fun onListen(args: Any?, sink: EventChannel.EventSink?) {
                    eventSink = sink
                }
                override fun onCancel(args: Any?) { eventSink = null }
            })
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        intent.data?.toString()?.let { eventSink?.success(it) }
    }
}
```

## iOS — AppDelegate.swift patch

In `ios/Runner/AppDelegate.swift`:

```swift
import UIKit
import Flutter

@UIApplicationMain
@objc class AppDelegate: FlutterAppDelegate {
    private var eventSink: FlutterEventSink?

    override func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        let controller = window?.rootViewController as! FlutterViewController

        FlutterMethodChannel(name: "travirt/deeplink", binaryMessenger: controller.binaryMessenger)
            .setMethodCallHandler { [weak self] call, result in
                if call.method == "getInitialLink" {
                    result(nil) // iOS handles via openURL below
                }
            }

        FlutterEventChannel(name: "travirt/deeplink/events", binaryMessenger: controller.binaryMessenger)
            .setStreamHandler(self)

        GeneratedPluginRegistrant.register(with: self)
        return super.application(application, didFinishLaunchingWithOptions: launchOptions)
    }

    override func application(_ app: UIApplication, open url: URL,
                               options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        eventSink?(url.absoluteString)
        return true
    }
}

extension AppDelegate: FlutterStreamHandler {
    func onListen(withArguments arguments: Any?, eventSink events: @escaping FlutterEventSink) -> FlutterError? {
        eventSink = events
        return nil
    }
    func onCancel(withArguments arguments: Any?) -> FlutterError? {
        eventSink = nil
        return nil
    }
}
```

## Firebase Push Notifications (FCM)

### Step 1 — Create Firebase project
1. Go to [console.firebase.google.com](https://console.firebase.google.com) → New project → "travirt"
2. Add Android app: package name `com.travirt.app`, download `google-services.json` → place at `android/app/google-services.json`
3. Add iOS app: bundle ID `com.travirt.app`, download `GoogleService-Info.plist` → place at `ios/Runner/GoogleService-Info.plist`

### Step 2 — Android gradle
In `android/build.gradle` (project-level), add to `dependencies`:
```groovy
classpath 'com.google.gms:google-services:4.4.1'
```
In `android/app/build.gradle` (app-level), add at the bottom:
```groovy
apply plugin: 'com.google.gms.google-services'
```

### Step 3 — iOS
In Xcode: Signing & Capabilities → + Capability → Push Notifications
Also add Background Modes → Remote notifications

### Step 4 — Backend FCM send
When an order executes, the backend should send a FCM message to the user's device token (stored when user logs in). Example:
```json
{
  "to": "<device_token>",
  "notification": { "title": "Order Filled", "body": "RELIANCE BUY 10 @ ₹2,450" },
  "data": { "route": "/app/orders" }
}
```
The `route` field is used by the app to navigate to the correct screen on tap.

### Step 5 — Store FCM token on backend
After login, the app should POST the FCM token to `/auth/fcm-token`:
```dart
final token = await NotificationService().getToken();
if (token != null) dio.post('/auth/fcm-token', data: {'token': token});
```

---

## Alice Blue OAuth Redirect URI

In your Alice Blue ANT developer portal, set the OAuth redirect URI to:
```
travirt://broker/alice/callback
```

And ensure the backend `/broker/alice/auth-url` endpoint returns an ANT OAuth URL
that redirects to `travirt://broker/alice/callback?authCode=xxx`.
