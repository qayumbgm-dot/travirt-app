import '../../../../core/utils/result.dart';
import '../entities/portfolio_summary.dart';
import '../repositories/dashboard_repository.dart';

class GetMarketIndicesUseCase {
  const GetMarketIndicesUseCase(this._repository);
  final DashboardRepository _repository;

  Future<Result<List<IndexQuote>>> execute() => _repository.getIndices();
}
