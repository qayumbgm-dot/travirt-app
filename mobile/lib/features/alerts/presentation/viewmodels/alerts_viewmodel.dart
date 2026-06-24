import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../app/di/injection_container.dart';
import '../../domain/entities/alert.dart';
import '../../domain/usecases/list_alerts_usecase.dart';
import '../../domain/usecases/create_alert_usecase.dart';
import '../../domain/usecases/cancel_alert_usecase.dart';

class AlertsNotifier extends AsyncNotifier<List<Alert>> {
  @override
  Future<List<Alert>> build() => _fetch();

  Future<List<Alert>> _fetch() async {
    final result = await sl<ListAlertsUseCase>().execute();
    return result.when(success: (v) => v, failure: (_) => []);
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(_fetch);
  }

  Future<String?> create({
    required String symbol,
    required String exchange,
    required String property,
    required String operator,
    required double value,
    String type = 'ALERT_ONLY',
  }) async {
    final result = await sl<CreateAlertUseCase>().execute(
      symbol: symbol,
      exchange: exchange,
      property: property,
      operator: operator,
      value: value,
      type: type,
    );
    return result.when(
      success: (alert) {
        state.whenData((list) {
          state = AsyncData([alert, ...list]);
        });
        return null;
      },
      failure: (e) => e.message,
    );
  }

  Future<String?> cancel(String id) async {
    final result = await sl<CancelAlertUseCase>().execute(id);
    return result.when(
      success: (_) {
        state.whenData((list) {
          state = AsyncData(
            list.map((a) => a.id == id ? _withStatus(a, 'CANCELLED') : a).toList(),
          );
        });
        return null;
      },
      failure: (e) => e.message,
    );
  }

  Alert _withStatus(Alert a, String status) => Alert(
        id: a.id,
        symbol: a.symbol,
        exchange: a.exchange,
        property: a.property,
        operator: a.operator,
        value: a.value,
        type: a.type,
        status: status,
        createdAt: a.createdAt,
        expiresAt: a.expiresAt,
      );
}

final alertsProvider =
    AsyncNotifierProvider<AlertsNotifier, List<Alert>>(AlertsNotifier.new);
