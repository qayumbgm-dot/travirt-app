import '../../../../core/utils/result.dart';
import '../entities/holding.dart';
import '../repositories/portfolio_repository.dart';

class GetPortfolioUseCase {
  const GetPortfolioUseCase(this._repository);
  final PortfolioRepository _repository;

  Future<Result<List<Holding>>> execute() => _repository.getHoldings();
}
