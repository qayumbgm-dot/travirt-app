import '../../../../core/utils/result.dart';
import '../entities/symbol.dart';

abstract interface class MarketRepository {
  Future<Result<List<MarketSymbol>>> searchSymbols(String query);
  Future<Result<List<MarketSymbol>>> getIndices();
  Future<Result<MarketSymbol>> getQuote(String token, String exchange);
}
