import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../app/di/injection_container.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/notifications/notification_service.dart';
import '../../domain/usecases/login_usecase.dart';
import '../../domain/usecases/signup_usecase.dart';
import '../../domain/usecases/logout_usecase.dart';
import '../../domain/usecases/restore_session_usecase.dart';
import '../state/auth_state.dart';

final authViewModelProvider =
    NotifierProvider<AuthViewModel, AuthState>(AuthViewModel.new);

class AuthViewModel extends Notifier<AuthState> {
  late final LoginUseCase _login;
  late final SignupUseCase _signup;
  late final LogoutUseCase _logout;
  late final RestoreSessionUseCase _restoreSession;

  @override
  AuthState build() {
    _login          = sl<LoginUseCase>();
    _signup         = sl<SignupUseCase>();
    _logout         = sl<LogoutUseCase>();
    _restoreSession = sl<RestoreSessionUseCase>();
    _tryRestore();
    return AuthState.initial;
  }

  Future<void> _tryRestore() async {
    state = AuthState.loading;
    final result = await _restoreSession.execute();
    result.when(
      success: (user) => state = AuthState(
        status: AuthStatus.authenticated,
        user: user,
      ),
      failure: (_) => state = AuthState.unauthenticated,
    );
  }

  Future<String?> login(String identifier, String password) async {
    state = AuthState.loading;
    final result = await _login.execute(identifier, password);
    return result.when(
      success: (data) {
        if (data.requires2FA) {
          state = AuthState(
            status: AuthStatus.unauthenticated,
            requires2FA: true,
            tempToken: data.tempToken,
          );
          return data.tempToken;
        }
        state = AuthState(status: AuthStatus.authenticated, user: data.user);
        // Register FCM token with backend after successful login
        _registerFcmToken();
        return null;
      },
      failure: (e) {
        state = AuthState(
          status: AuthStatus.error,
          error: e.message,
        );
        return null;
      },
    );
  }

  Future<bool> signup({
    required String username,
    required String email,
    required String password,
  }) async {
    state = AuthState.loading;
    final result = await _signup.execute(
      username: username,
      email: email,
      password: password,
    );
    return result.when(
      success: (_) {
        state = AuthState.unauthenticated;
        return true;
      },
      failure: (e) {
        state = AuthState(status: AuthStatus.error, error: e.message);
        return false;
      },
    );
  }

  Future<void> logout() async {
    await _logout.execute();
    state = AuthState.unauthenticated;
  }

  Future<void> refreshSession() async {
    final result = await _restoreSession.execute();
    result.when(
      success: (user) {
        state = AuthState(status: AuthStatus.authenticated, user: user);
      },
      failure: (_) {},
    );
  }

  void clearError() {
    if (state.error != null) {
      state = state.copyWith(status: AuthStatus.unauthenticated);
    }
  }

  Future<void> _registerFcmToken() async {
    try {
      final token = await NotificationService().getToken();
      if (token == null) return;
      await sl<ApiClient>().post('/auth/fcm-token', data: {'token': token});
    } catch (_) {
      // Non-critical — swallow silently
    }
  }
}
