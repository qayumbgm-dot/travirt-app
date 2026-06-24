import '../../../../core/network/api_client.dart';
import '../../../../core/constants/api_constants.dart';
import '../../domain/entities/order.dart';

abstract interface class TradeRemoteDataSource {
  Future<Map<String, dynamic>> placeOrder(Map<String, dynamic> payload);
  Future<List<dynamic>> getOrders();
  Future<List<dynamic>> getPositions();
  Future<void> cancelOrder(String orderId);
}

class TradeRemoteDataSourceImpl implements TradeRemoteDataSource {
  const TradeRemoteDataSourceImpl(this._client);
  final ApiClient _client;

  @override
  Future<Map<String, dynamic>> placeOrder(Map<String, dynamic> payload) async {
    final res = await _client.post(ApiConstants.placeOrder, data: payload);
    return res.data as Map<String, dynamic>;
  }

  @override
  Future<List<dynamic>> getOrders() async {
    final res = await _client.get(ApiConstants.orders);
    return res.data as List<dynamic>;
  }

  @override
  Future<List<dynamic>> getPositions() async {
    final res = await _client.get(ApiConstants.positions);
    return res.data as List<dynamic>;
  }

  @override
  Future<void> cancelOrder(String orderId) =>
      _client.delete('${ApiConstants.placeOrder}/$orderId');
}
