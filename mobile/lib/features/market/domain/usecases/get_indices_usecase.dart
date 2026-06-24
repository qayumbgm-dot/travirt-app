import '../../../../core/utils/result.dart';
import '../entities/symbol.dart';
import '../repositories/market_repository.dart';

class GetIndicesUseCase {
  const GetIndicesUseCase(this._repository);
  final MarketRepository _repository;

  Future<Result<List<MarketSymbol>>> execute() => _repository.getIndices();
}
