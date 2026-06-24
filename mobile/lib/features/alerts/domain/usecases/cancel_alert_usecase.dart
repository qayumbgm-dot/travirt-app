import '../../../../core/utils/result.dart';
import '../repositories/alert_repository.dart';

class CancelAlertUseCase {
  const CancelAlertUseCase(this._repo);
  final AlertRepository _repo;

  Future<Result<bool>> execute(String id) => _repo.cancelAlert(id);
}
