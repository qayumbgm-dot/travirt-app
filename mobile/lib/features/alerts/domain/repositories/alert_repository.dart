import '../../../../core/utils/result.dart';
import '../entities/alert.dart';

abstract class AlertRepository {
  Future<Result<List<Alert>>> listAlerts();
  Future<Result<Alert>> createAlert({
    required String symbol,
    required String exchange,
    required String property,
    required String operator,
    required double value,
    String type,
  });
  Future<Result<bool>> cancelAlert(String id);
}
