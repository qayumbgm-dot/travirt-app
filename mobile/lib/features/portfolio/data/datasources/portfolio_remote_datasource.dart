import '../../../../core/network/api_client.dart';
import '../../../../core/constants/api_constants.dart';

abstract interface class PortfolioRemoteDataSource {
  Future<List<dynamic>> getHoldings();
  Future<List<dynamic>> getEquityCurve();
  Future<Map<String, dynamic>> getTradeStats();
}

class PortfolioRemoteDataSourceImpl implements PortfolioRemoteDataSource {
  const PortfolioRemoteDataSourceImpl(this._client);
  final ApiClient _client;

  @override
  Future<List<dynamic>> getHoldings() async {
    final res = await _client.get(ApiConstants.holdings);
    return res.data as List<dynamic>;
  }

  @override
  Future<List<dynamic>> getEquityCurve() async {
    final res = await _client.get(ApiConstants.equityCurve);
    return res.data as List<dynamic>;
  }

  @override
  Future<Map<String, dynamic>> getTradeStats() async {
    final res = await _client.get(ApiConstants.tradeStats);
    return res.data as Map<String, dynamic>;
  }
}
