import '../../../../core/exceptions/app_exception.dart';
import '../../../../core/utils/result.dart';
import '../../domain/entities/alert.dart';
import '../../domain/repositories/alert_repository.dart';
import '../datasources/alert_remote_datasource.dart';

class AlertRepositoryImpl implements AlertRepository {
  const AlertRepositoryImpl(this._remote);
  final AlertRemoteDataSource _remote;

  @override
  Future<Result<List<Alert>>> listAlerts() async {
    try {
      final list = await _remote.listAlerts();
      return Success(list.map((e) => _fromMap(e as Map<String, dynamic>)).toList());
    } catch (_) {
      return const Failure(UnknownException());
    }
  }

  @override
  Future<Result<Alert>> createAlert({
    required String symbol,
    required String exchange,
    required String property,
    required String operator,
    required double value,
    String type = 'ALERT_ONLY',
  }) async {
    try {
      final data = await _remote.createAlert({
        'symbol': symbol,
        'exchange': exchange,
        'property': property,
        'operator': operator,
        'value': value,
        'type': type,
      });
      return Success(_fromMap(data));
    } catch (e) {
      return Failure(e is AppException ? e : const UnknownException());
    }
  }

  @override
  Future<Result<bool>> cancelAlert(String id) async {
    try {
      await _remote.cancelAlert(id);
      return const Success(true);
    } catch (_) {
      return const Failure(UnknownException());
    }
  }

  Alert _fromMap(Map<String, dynamic> m) => Alert(
        id:        m['id']       as String,
        symbol:    m['symbol']   as String,
        exchange:  m['exchange'] as String? ?? 'NSE',
        property:  m['property'] as String,
        operator:  m['operator'] as String,
        value:     (m['value']   as num).toDouble(),
        type:      m['type']     as String? ?? 'ALERT_ONLY',
        status:    m['status']   as String,
        createdAt: DateTime.tryParse(m['created_at'] as String? ?? '') ?? DateTime.now(),
        expiresAt: m['expires_at'] != null
            ? DateTime.tryParse(m['expires_at'] as String)
            : null,
      );
}
