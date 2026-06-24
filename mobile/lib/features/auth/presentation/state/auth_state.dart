import '../../domain/entities/user.dart';

enum AuthStatus { initial, loading, authenticated, unauthenticated, error }

class AuthState {
  const AuthState({
    this.status = AuthStatus.initial,
    this.user,
    this.error,
    this.tempToken,
    this.requires2FA = false,
  });

  final AuthStatus status;
  final User? user;
  final String? error;
  final String? tempToken;
  final bool requires2FA;

  bool get isLoading       => status == AuthStatus.loading;
  bool get isAuthenticated => status == AuthStatus.authenticated;

  AuthState copyWith({
    AuthStatus? status,
    User? user,
    String? error,
    String? tempToken,
    bool? requires2FA,
  }) =>
      AuthState(
        status: status ?? this.status,
        user: user ?? this.user,
        error: error,
        tempToken: tempToken ?? this.tempToken,
        requires2FA: requires2FA ?? this.requires2FA,
      );

  static const initial      = AuthState(status: AuthStatus.initial);
  static const loading      = AuthState(status: AuthStatus.loading);
  static const unauthenticated = AuthState(status: AuthStatus.unauthenticated);
}
