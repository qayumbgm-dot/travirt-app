import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/deeplink/deeplink_service.dart';
import '../../../../core/network/api_client.dart';
import '../../../../app/di/injection_container.dart';

enum AliceOAuthStatus { idle, exchanging, connected, error }

class AliceOAuthState {
  const AliceOAuthState({this.status = AliceOAuthStatus.idle, this.error});
  final AliceOAuthStatus status;
  final String? error;
  bool get isConnected => status == AliceOAuthStatus.connected;
}

final aliceOAuthProvider =
    NotifierProvider<AliceOAuthNotifier, AliceOAuthState>(
      AliceOAuthNotifier.new,
    );

class AliceOAuthNotifier extends Notifier<AliceOAuthState> {
  @override
  AliceOAuthState build() {
    // Listen for deep links that carry the OAuth authCode
    ref.watch(deepLinkServiceProvider).links.listen(_handleLink);
    return const AliceOAuthState();
  }

  void _handleLink(Uri uri) {
    // travirt://broker/alice/callback?authCode=xxx
    if (uri.host == 'broker' && uri.path.startsWith('/alice/callback')) {
      final code = uri.queryParameters['authCode'];
      if (code != null) _exchangeCode(code);
    }
  }

  Future<void> _exchangeCode(String authCode) async {
    state = const AliceOAuthState(status: AliceOAuthStatus.exchanging);
    try {
      await sl<ApiClient>().post(
        '/broker/alice/callback',
        data: {'authCode': authCode},
      );
      state = const AliceOAuthState(status: AliceOAuthStatus.connected);
    } catch (e) {
      state = AliceOAuthState(
        status: AliceOAuthStatus.error,
        error: 'Failed to connect: ${e.toString()}',
      );
    }
  }

  void reset() => state = const AliceOAuthState();
}
