import '../../../../core/network/api_client.dart';
import '../../../../core/constants/api_constants.dart';

abstract interface class AlertRemoteDataSource {
  Future<List<dynamic>> listAlerts();
  Future<Map<String, dynamic>> createAlert(Map<String, dynamic> payload);
  Future<void> cancelAlert(String id);
}

class AlertRemoteDataSourceImpl implements AlertRemoteDataSource {
  const AlertRemoteDataSourceImpl(this._client);
  final ApiClient _client;

  @override
  Future<List<dynamic>> listAlerts() async {
    final res = await _client.get(ApiConstants.alerts);
    final body = res.data as Map<String, dynamic>;
    return body['alerts'] as List<dynamic>;
  }

  @override
  Future<Map<String, dynamic>> createAlert(Map<String, dynamic> payload) async {
    final res = await _client.post(ApiConstants.alerts, data: payload);
    return res.data as Map<String, dynamic>;
  }

  @override
  Future<void> cancelAlert(String id) =>
      _client.delete('${ApiConstants.alerts}/$id');
}
