import '../../../../core/utils/result.dart';
import '../repositories/auth_repository.dart';

class LogoutUseCase {
  const LogoutUseCase(this._repository);
  final AuthRepository _repository;

  Future<Result<void>> execute() => _repository.logout();
}
