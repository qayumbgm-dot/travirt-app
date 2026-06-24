import 'dart:async';
import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import '../constants/api_constants.dart';
import '../storage/secure_storage.dart';
import '../../app/di/injection_container.dart';

// Derives the WebSocket URL from the HTTP base URL.
String _wsUrl() {
  final base = ApiConstants.baseUrl
      .replaceFirst(RegExp(r'^https'), 'wss')
      .replaceFirst(RegExp(r'^http'), 'ws');
  // Strip /api suffix — WS lives at root /ws
  return base.replaceFirst(RegExp(r'/api$'), '/ws');
}

/// Holds the latest tick for a symbol token.
class PriceTick {
  const PriceTick({
    required this.token,
    required this.ltp,
    required this.change,
    required this.changePct,
  });
  final String token;
  final double ltp;
  final double change;
  final double changePct;
}

/// Manages one WebSocket connection; streams per-token price ticks.
class PriceFeedService {
  PriceFeedService(this._storage);
  final SecureStorage _storage;

  WebSocketChannel? _channel;
  final _controller = StreamController<PriceTick>.broadcast();
  final _subscribed  = <String>{};
  bool _connected    = false;
  Timer? _heartbeat;

  Stream<PriceTick> get ticks => _controller.stream;

  Future<void> connect() async {
    if (_connected) return;
    final token = await _storage.read(StorageKeys.accessToken);
    if (token == null) return;

    try {
      _channel = WebSocketChannel.connect(
        Uri.parse('${_wsUrl()}?token=$token'),
      );
      _connected = true;
      _channel!.stream.listen(
        _onMessage,
        onError: (_) => _scheduleReconnect(),
        onDone: () => _scheduleReconnect(),
      );
      _heartbeat = Timer.periodic(
        const Duration(seconds: 20),
        (_) => _send({'type': 'ping'}),
      );
      // Re-subscribe after reconnect
      for (final t in _subscribed) {
        _send({'type': 'subscribe', 'token': t});
      }
    } catch (_) {
      _scheduleReconnect();
    }
  }

  void subscribe(String token) {
    _subscribed.add(token);
    if (_connected) _send({'type': 'subscribe', 'token': token});
  }

  void unsubscribe(String token) {
    _subscribed.remove(token);
    if (_connected) _send({'type': 'unsubscribe', 'token': token});
  }

  void disconnect() {
    _heartbeat?.cancel();
    _channel?.sink.close();
    _connected = false;
  }

  void _onMessage(dynamic raw) {
    try {
      final msg = jsonDecode(raw as String) as Map<String, dynamic>;
      if (msg['type'] == 'tick') {
        _controller.add(PriceTick(
          token:     msg['token']     as String,
          ltp:       (msg['ltp']      as num).toDouble(),
          change:    (msg['change']   as num).toDouble(),
          changePct: (msg['changePct'] as num).toDouble(),
        ));
      }
    } catch (_) {}
  }

  void _send(Map<String, dynamic> msg) {
    try {
      _channel?.sink.add(jsonEncode(msg));
    } catch (_) {}
  }

  void _scheduleReconnect() {
    _connected = false;
    Future.delayed(const Duration(seconds: 5), connect);
  }

  void dispose() {
    disconnect();
    _controller.close();
  }
}

// ── Riverpod provider ─────────────────────────────────────────────────────────

final priceFeedServiceProvider = Provider<PriceFeedService>((ref) {
  final service = PriceFeedService(sl<SecureStorage>());
  ref.onDispose(service.dispose);
  return service;
});

/// Watches the live LTP for a single token.
/// Returns null until the first tick arrives.
final ltpProvider = StreamProvider.family<PriceTick?, String>((ref, token) {
  final feed = ref.watch(priceFeedServiceProvider);
  feed.subscribe(token);
  ref.onDispose(() => feed.unsubscribe(token));
  return feed.ticks
      .where((t) => t.token == token)
      .map<PriceTick?>((t) => t)
      .asBroadcastStream();
});
