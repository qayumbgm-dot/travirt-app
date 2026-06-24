import '../../../../core/utils/result.dart';
import '../entities/order.dart';

abstract interface class TradeRepository {
  Future<Result<Order>> placeOrder({
    required String symbol,
    required String exchange,
    required String token,
    required OrderSide side,
    required OrderType type,
    required ProductType product,
    required int quantity,
    required double price,
    double? triggerPrice,
  });

  Future<Result<List<Order>>> getOrders();
  Future<Result<List<Position>>> getPositions();
  Future<Result<void>> cancelOrder(String orderId);
}
