import '../../../../core/utils/result.dart';
import '../entities/portfolio_summary.dart';
import '../repositories/dashboard_repository.dart';

class GetDashboardUseCase {
  const GetDashboardUseCase(this._repository);
  final DashboardRepository _repository;

  Future<Result<PortfolioSummary>> execute() => _repository.getSummary();
}
