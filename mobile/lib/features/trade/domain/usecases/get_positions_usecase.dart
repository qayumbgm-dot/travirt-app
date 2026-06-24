import '../../../../core/utils/result.dart';
import '../entities/order.dart';
import '../repositories/trade_repository.dart';

class GetPositionsUseCase {
  const GetPositionsUseCase(this._repository);
  final TradeRepository _repository;

  Future<Result<List<Position>>> execute() => _repository.getPositions();
}
