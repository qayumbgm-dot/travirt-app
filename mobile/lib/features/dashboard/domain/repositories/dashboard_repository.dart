import '../../../../core/utils/result.dart';
import '../entities/portfolio_summary.dart';

abstract interface class DashboardRepository {
  Future<Result<PortfolioSummary>> getSummary();
  Future<Result<List<IndexQuote>>> getIndices();
  Future<Result<List<Map<String, dynamic>>>> getEquityCurve();
}
