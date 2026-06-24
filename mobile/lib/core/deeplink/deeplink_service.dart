import 'dart:async';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

// Listens for incoming deep links and exposes them as a stream.
// Alice Blue OAuth returns to: travirt://broker/alice/callback?authCode=xxx
class DeepLinkService {
  static const _channel = MethodChannel('travirt/deeplink');
  static const _eventChannel = EventChannel('travirt/deeplink/events');

  final _controller = StreamController<Uri>.broadcast();

  Stream<Uri> get links => _controller.stream;

  void init() {
    _eventChannel.receiveBroadcastStream().listen((raw) {
      try {
        _controller.add(Uri.parse(raw as String));
      } catch (_) {}
    });
  }

  void dispose() => _controller.close();

  // For Android: handle initial intent link (app cold-started via deep link)
  Future<Uri?> getInitialLink() async {
    try {
      final raw = await _channel.invokeMethod<String>('getInitialLink');
      if (raw == null) return null;
      return Uri.parse(raw);
    } catch (_) {
      return null;
    }
  }
}

final deepLinkServiceProvider = Provider<DeepLinkService>((ref) {
  final svc = DeepLinkService()..init();
  ref.onDispose(svc.dispose);
  return svc;
});
