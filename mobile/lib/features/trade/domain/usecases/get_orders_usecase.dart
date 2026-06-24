import '../../../../core/utils/result.dart';
import '../entities/order.dart';
import '../repositories/trade_repository.dart';

class GetOrdersUseCase {
  const GetOrdersUseCase(this._repository);
  final TradeRepository _repository;

  Future<Result<List<Order>>> execute() => _repository.getOrders();
}
