import '../../../../core/utils/result.dart';
import '../entities/alert.dart';
import '../repositories/alert_repository.dart';

class CreateAlertUseCase {
  const CreateAlertUseCase(this._repo);
  final AlertRepository _repo;

  Future<Result<Alert>> execute({
    required String symbol,
    required String exchange,
    required String property,
    required String operator,
    required double value,
    String type = 'ALERT_ONLY',
  }) =>
      _repo.createAlert(
        symbol: symbol,
        exchange: exchange,
        property: property,
        operator: operator,
        value: value,
        type: type,
      );
}
