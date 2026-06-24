import '../../../../core/exceptions/app_exception.dart';
import '../../../../core/utils/result.dart';
import '../../domain/entities/holding.dart';
import '../../domain/repositories/portfolio_repository.dart';
import '../datasources/portfolio_remote_datasource.dart';

class PortfolioRepositoryImpl implements PortfolioRepository {
  const PortfolioRepositoryImpl(this._remote);
  final PortfolioRemoteDataSource _remote;

  @override
  Future<Result<List<Holding>>> getHoldings() async {
    try {
      final list = await _remote.getHoldings();
      return Success(list.map((e) {
        final m = e as Map<String, dynamic>;
        return Holding(
          symbol:        m['symbol']        as String,
          exchange:      m['exchange']      as String? ?? 'NSE',
          quantity:      m['quantity']      as int,
          avgPrice:      (m['avgPrice']     as num).toDouble(),
          ltp:           (m['ltp']          as num).toDouble(),
          currentValue:  (m['currentValue'] as num).toDouble(),
          investedValue: (m['investedValue'] as num).toDouble(),
          pnl:           (m['pnl']          as num).toDouble(),
          pnlPct:        (m['pnlPct']       as num).toDouble(),
        );
      }).toList());
    } catch (_) {
      return const Failure(UnknownException());
    }
  }

  @override
  Future<Result<List<Map<String, dynamic>>>> getEquityCurve() async {
    try {
      final list = await _remote.getEquityCurve();
      return Success(list.cast<Map<String, dynamic>>());
    } catch (_) {
      return const Failure(UnknownException());
    }
  }

  @override
  Future<Result<Map<String, dynamic>>> getTradeStats() async {
    try {
      final data = await _remote.getTradeStats();
      return Success(data);
    } catch (_) {
      return const Failure(UnknownException());
    }
  }
}
