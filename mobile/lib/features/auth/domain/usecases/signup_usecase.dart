import '../../../../core/utils/result.dart';
import '../../../../core/exceptions/app_exception.dart';
import '../entities/user.dart';
import '../repositories/auth_repository.dart';

class SignupUseCase {
  const SignupUseCase(this._repository);
  final AuthRepository _repository;

  Future<Result<User>> execute({
    required String username,
    required String email,
    required String password,
  }) {
    if (username.trim().length < 3) {
      return Future.value(Failure(
        const ValidationException('Username must be at least 3 characters.'),
      ));
    }
    if (!_isValidEmail(email)) {
      return Future.value(Failure(
        const ValidationException('Please enter a valid email address.'),
      ));
    }
    if (!_isStrongPassword(password)) {
      return Future.value(Failure(
        const ValidationException(
          'Password must be 8+ characters with uppercase, lowercase and number.',
        ),
      ));
    }
    return _repository.signup(
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password: password,
    );
  }

  bool _isValidEmail(String email) =>
      RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(email);

  bool _isStrongPassword(String pw) =>
      pw.length >= 8 &&
      pw.contains(RegExp(r'[A-Z]')) &&
      pw.contains(RegExp(r'[a-z]')) &&
      pw.contains(RegExp(r'[0-9]'));
}
