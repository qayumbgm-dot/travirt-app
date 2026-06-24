import '../../../../core/utils/result.dart';
import '../entities/order.dart';
import '../repositories/trade_repository.dart';

class PlaceOrderUseCase {
  const PlaceOrderUseCase(this._repository);
  final TradeRepository _repository;

  Future<Result<Order>> execute({
    required String symbol,
    required String exchange,
    required String token,
    required OrderSide side,
    required OrderType type,
    required ProductType product,
    required int quantity,
    required double price,
    double? triggerPrice,
  }) {
    if (quantity <= 0) {
      return Future.value(
        const Failure(ValidationException('Quantity must be greater than 0.')),
      );
    }
    if (type != OrderType.market && price <= 0) {
      return Future.value(
        const Failure(ValidationException('Enter a valid price.')),
      );
    }
    return _repository.placeOrder(
      symbol: symbol, exchange: exchange, token: token,
      side: side, type: type, product: product,
      quantity: quantity, price: price, triggerPrice: triggerPrice,
    );
  }
}
