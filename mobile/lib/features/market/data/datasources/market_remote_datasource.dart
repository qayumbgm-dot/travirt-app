import '../../../../core/network/api_client.dart';
import '../../../../core/constants/api_constants.dart';

abstract interface class MarketRemoteDataSource {
  Future<List<dynamic>> searchSymbols(String query);
  Future<List<dynamic>> getIndices();
  Future<Map<String, dynamic>> getQuote(String token, String exchange);
}

class MarketRemoteDataSourceImpl implements MarketRemoteDataSource {
  const MarketRemoteDataSourceImpl(this._client);
  final ApiClient _client;

  @override
  Future<List<dynamic>> searchSymbols(String query) async {
    final res = await _client.get(ApiConstants.searchSymbols,
        queryParameters: {'q': query});
    return res.data as List<dynamic>;
  }

  @override
  Future<List<dynamic>> getIndices() async {
    final res = await _client.get(ApiConstants.indices);
    return res.data as List<dynamic>;
  }

  @override
  Future<Map<String, dynamic>> getQuote(String token, String exchange) async {
    final res = await _client.get(ApiConstants.quote,
        queryParameters: {'token': token, 'exchange': exchange});
    return res.data as Map<String, dynamic>;
  }
}
