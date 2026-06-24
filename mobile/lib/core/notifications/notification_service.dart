import 'dart:async';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart' show Color;
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

// Background message handler — must be top-level
@pragma('vm:entry-point')
Future<void> firebaseBackgroundHandler(RemoteMessage message) async {
  // Firebase is already initialised before this is called
}

// Stream that app.dart subscribes to for navigating on notification tap
final notificationRouteController = StreamController<String>.broadcast();

final notificationServiceProvider = Provider<NotificationService>((ref) {
  return NotificationService();
});

class NotificationService {
  NotificationService._();
  factory NotificationService() => _instance;
  static final _instance = NotificationService._();

  static const _enabledKey = 'notifications_enabled';

  final _fcm = FirebaseMessaging.instance;
  final _local = FlutterLocalNotificationsPlugin();

  static const _channel = AndroidNotificationChannel(
    'travirt_orders',
    'Order Alerts',
    description: 'Notifications for order fills and trade updates',
    importance: Importance.high,
  );

  Future<void> init() async {
    FirebaseMessaging.onBackgroundMessage(firebaseBackgroundHandler);

    await _local
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(_channel);

    const androidInit =
        AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosInit = DarwinInitializationSettings(
      requestAlertPermission: false,
      requestBadgePermission: false,
      requestSoundPermission: false,
    );
    await _local.initialize(
      const InitializationSettings(android: androidInit, iOS: iosInit),
      onDidReceiveNotificationResponse: _onLocalTap,
    );

    await _requestPermission();

    await FirebaseMessaging.instance
        .setForegroundNotificationPresentationOptions(
      alert: true,
      badge: true,
      sound: true,
    );

    FirebaseMessaging.onMessage.listen(_handleForeground);
  }

  Future<void> _requestPermission() async {
    final settings = await _fcm.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );
    if (settings.authorizationStatus == AuthorizationStatus.authorized ||
        settings.authorizationStatus == AuthorizationStatus.provisional) {
      final prefs = await SharedPreferences.getInstance();
      if (!prefs.containsKey(_enabledKey)) {
        await prefs.setBool(_enabledKey, true);
      }
    }
  }

  Future<String?> getToken() => _fcm.getToken();

  Future<bool> isEnabled() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_enabledKey) ?? false;
  }

  Future<void> setEnabled(bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_enabledKey, value);
    if (value) {
      await _fcm.subscribeToTopic('orders');
    } else {
      await _fcm.unsubscribeFromTopic('orders');
      await _local.cancelAll();
    }
  }

  void _handleForeground(RemoteMessage message) async {
    if (!await isEnabled()) return;
    final notification = message.notification;
    if (notification == null) return;

    await _local.show(
      notification.hashCode,
      notification.title,
      notification.body,
      NotificationDetails(
        android: AndroidNotificationDetails(
          _channel.id,
          _channel.name,
          channelDescription: _channel.description,
          importance: Importance.high,
          priority: Priority.high,
          color: const Color(0xFF007BFF),
        ),
        iOS: const DarwinNotificationDetails(
          presentAlert: true,
          presentBadge: true,
          presentSound: true,
        ),
      ),
      payload: message.data['route'],
    );
  }

  void _onLocalTap(NotificationResponse response) {
    final route = response.payload;
    if (route != null && route.isNotEmpty) {
      notificationRouteController.add(route);
    }
  }
}
