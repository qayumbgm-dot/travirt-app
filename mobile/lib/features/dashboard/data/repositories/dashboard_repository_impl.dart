import 'package:dio/dio.dart';
import '../../../../core/exceptions/app_exception.dart';
import '../../../../core/utils/result.dart';
import '../../domain/entities/portfolio_summary.dart';
import '../../domain/repositories/dashboard_repository.dart';
import '../datasources/dashboard_remote_datasource.dart';

class DashboardRepositoryImpl implements DashboardRepository {
  const DashboardRepositoryImpl(this._remote);
  final DashboardRemoteDataSource _remote;

  @override
  Future<Result<PortfolioSummary>> getSummary() async {
    try {
      final data = await _remote.getSummary();
      return Success(PortfolioSummary(
        totalValue:    (data['totalValue']    as num?)?.toDouble() ?? 0,
        virtualBalance:(data['virtualBalance'] as num?)?.toDouble() ?? 0,
        invested:      (data['invested']      as num?)?.toDouble() ?? 0,
        totalPnl:      (data['totalPnl']      as num?)?.toDouble() ?? 0,
        dayPnl:        (data['dayPnl']        as num?)?.toDouble() ?? 0,
        totalPnlPct:   (data['totalPnlPct']   as num?)?.toDouble() ?? 0,
        dayPnlPct:     (data['dayPnlPct']     as num?)?.toDouble() ?? 0,
        holdingsCount: (data['holdingsCount'] as int?) ?? 0,
        winRate:       (data['winRate']       as num?)?.toDouble() ?? 0,
        marketMode:    data['marketMode']     as String? ?? 'SIMULATION',
      ));
    } on DioException catch (e) {
      return Failure(e.error is AppException
          ? e.error as AppException
          : const UnknownException());
    } catch (_) {
      return const Failure(UnknownException());
    }
  }

  @override
  Future<Result<List<IndexQuote>>> getIndices() async {
    try {
      final list = await _remote.getIndices();
      return Success(list.map((e) {
        final m = e as Map<String, dynamic>;
        return IndexQuote(
          name:      m['name']      as String,
          value:     (m['value']    as num).toDouble(),
          change:    (m['change']   as num).toDouble(),
          changePct: (m['changePct'] as num).toDouble(),
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
}
