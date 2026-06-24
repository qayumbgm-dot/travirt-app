import '../../../../core/utils/result.dart';
import '../entities/user.dart';

abstract interface class AuthRepository {
  Future<Result<({User user, bool requires2FA, String? tempToken})>> login(
    String identifier,
    String password,
  );

  Future<Result<User>> signup({
    required String username,
    required String email,
    required String password,
  });

  Future<Result<User>> verifyTfa(String tempToken, String code);

  Future<Result<User>> restoreSession();

  Future<Result<void>> logout();

  Future<Result<void>> forgotPassword(String email);

  Future<Result<void>> resetPassword({
    required String token,
    required String newPassword,
  });

  Future<Result<void>> changePassword({
    required String currentPassword,
    required String newPassword,
  });

  Future<Result<User>> getProfile();
}
