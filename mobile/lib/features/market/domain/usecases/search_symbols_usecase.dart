import '../../../../core/utils/result.dart';
import '../entities/symbol.dart';
import '../repositories/market_repository.dart';

class SearchSymbolsUseCase {
  const SearchSymbolsUseCase(this._repository);
  final MarketRepository _repository;

  Future<Result<List<MarketSymbol>>> execute(String query) {
    if (query.trim().length < 2) return Future.value(const Success([]));
    return _repository.searchSymbols(query.trim());
  }
}
