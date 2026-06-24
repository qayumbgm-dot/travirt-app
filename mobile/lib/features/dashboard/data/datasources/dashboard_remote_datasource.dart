import '../../../../core/network/api_client.dart';
import '../../../../core/constants/api_constants.dart';

abstract interface class DashboardRemoteDataSource {
  Future<Map<String, dynamic>> getSummary();
  Future<List<dynamic>> getIndices();
  Future<List<dynamic>> getEquityCurve();
}

class DashboardRemoteDataSourceImpl implements DashboardRemoteDataSource {
  const DashboardRemoteDataSourceImpl(this._client);
  final ApiClient _client;

  @override
  Future<Map<String, dynamic>> getSummary() async {
    final res = await _client.get(ApiConstants.portfolioSummary);
    return res.data as Map<String, dynamic>;
  }

  @override
  Future<List<dynamic>> getIndices() async {
    final res = await _client.get(ApiConstants.indices);
    return res.data as List<dynamic>;
  }

  @override
  Future<List<dynamic>> getEquityCurve() async {
    final res = await _client.get(ApiConstants.equityCurve);
    return res.data as List<dynamic>;
  }
}
