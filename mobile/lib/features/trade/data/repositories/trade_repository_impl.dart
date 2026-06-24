import '../../../../core/exceptions/app_exception.dart';
import '../../../../core/utils/result.dart';
import '../../domain/entities/order.dart';
import '../../domain/repositories/trade_repository.dart';
import '../datasources/trade_remote_datasource.dart';

class TradeRepositoryImpl implements TradeRepository {
  const TradeRepositoryImpl(this._remote);
  final TradeRemoteDataSource _remote;

  @override
  Future<Result<Order>> placeOrder({
    required String symbol, required String exchange, required String token,
    required OrderSide side, required OrderType type, required ProductType product,
    required int quantity, required double price, double? triggerPrice,
  }) async {
    try {
      final data = await _remote.placeOrder({
        'symbol': symbol, 'exchange': exchange, 'token': token,
        'side': side.name.toUpperCase(),
        'type': type.name.toUpperCase(),
        'product': product.name.toUpperCase(),
        'quantity': quantity, 'price': price,
        if (triggerPrice != null) 'triggerPrice': triggerPrice,
      });
      return Success(_orderFromMap(data));
    } catch (e) {
      return Failure(e is AppException ? e : const UnknownException());
    }
  }

  @override
  Future<Result<List<Order>>> getOrders() async {
    try {
      final list = await _remote.getOrders();
      return Success(list.map((e) => _orderFromMap(e as Map<String, dynamic>)).toList());
    } catch (_) {
      return const Failure(UnknownException());
    }
  }

  @override
  Future<Result<List<Position>>> getPositions() async {
    try {
      final list = await _remote.getPositions();
      return Success(list.map((e) => _positionFromMap(e as Map<String, dynamic>)).toList());
    } catch (_) {
      return const Failure(UnknownException());
    }
  }

  @override
  Future<Result<void>> cancelOrder(String orderId) async {
    try {
      await _remote.cancelOrder(orderId);
      return const Success(null);
    } catch (_) {
      return const Failure(UnknownException());
    }
  }

  Order _orderFromMap(Map<String, dynamic> m) => Order(
    orderId:   m['orderId']   as String,
    symbol:    m['symbol']    as String,
    exchange:  m['exchange']  as String,
    side:      OrderSide.values.firstWhere((e) => e.name == (m['side'] as String).toLowerCase()),
    type:      OrderType.values.firstWhere((e) => e.name == (m['type'] as String).toLowerCase()),
    product:   ProductType.values.firstWhere((e) => e.name == (m['product'] as String).toLowerCase()),
    quantity:  m['quantity']  as int,
    price:     (m['price']    as num).toDouble(),
    status:    OrderStatus.values.firstWhere((e) => e.name == (m['status'] as String).toLowerCase(),
        orElse: () => OrderStatus.open),
    createdAt: DateTime.tryParse(m['createdAt'] as String? ?? '') ?? DateTime.now(),
    executedPrice: (m['executedPrice'] as num?)?.toDouble(),
    triggerPrice:  (m['triggerPrice']  as num?)?.toDouble(),
  );

  Position _positionFromMap(Map<String, dynamic> m) => Position(
    symbol:   m['symbol']   as String,
    exchange: m['exchange'] as String,
    product:  ProductType.values.firstWhere((e) => e.name == (m['product'] as String).toLowerCase()),
    quantity: m['quantity'] as int,
    avgPrice: (m['avgPrice'] as num).toDouble(),
    ltp:      (m['ltp']      as num).toDouble(),
    pnl:      (m['pnl']      as num).toDouble(),
    pnlPct:   (m['pnlPct']   as num).toDouble(),
  );
}
