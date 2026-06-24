import '../../../../core/utils/result.dart';
import '../entities/holding.dart';

abstract interface class PortfolioRepository {
  Future<Result<List<Holding>>> getHoldings();
  Future<Result<List<Map<String, dynamic>>>> getEquityCurve();
  Future<Result<Map<String, dynamic>>> getTradeStats();
}
