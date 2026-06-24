import '../../../../core/utils/result.dart';
import '../entities/alert.dart';
import '../repositories/alert_repository.dart';

class ListAlertsUseCase {
  const ListAlertsUseCase(this._repo);
  final AlertRepository _repo;

  Future<Result<List<Alert>>> execute() => _repo.listAlerts();
}
