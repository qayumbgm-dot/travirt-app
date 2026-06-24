import '../../../../core/utils/result.dart';
import '../entities/user.dart';
import '../repositories/auth_repository.dart';

class RestoreSessionUseCase {
  const RestoreSessionUseCase(this._repository);
  final AuthRepository _repository;

  Future<Result<User>> execute() => _repository.restoreSession();
}
