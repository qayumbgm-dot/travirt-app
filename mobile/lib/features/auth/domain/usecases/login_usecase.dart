import '../../../../core/utils/result.dart';
import '../entities/user.dart';
import '../repositories/auth_repository.dart';

class LoginUseCase {
  const LoginUseCase(this._repository);
  final AuthRepository _repository;

  Future<Result<({User user, bool requires2FA, String? tempToken})>> execute(
    String identifier,
    String password,
  ) {
    if (identifier.trim().isEmpty || password.isEmpty) {
      return Future.value(
        Failure(const ValidationException('Please enter your credentials.')),
      );
    }
    return _repository.login(identifier.trim(), password);
  }
}
