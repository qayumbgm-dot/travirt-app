import '../../../../core/exceptions/app_exception.dart';
import '../../../../core/utils/result.dart';
import '../../domain/entities/symbol.dart';
import '../../domain/repositories/market_repository.dart';
import '../datasources/market_remote_datasource.dart';

class MarketRepositoryImpl implements MarketRepository {
  const MarketRepositoryImpl(this._remote);
  final MarketRemoteDataSource _remote;

  MarketSymbol _fromMap(Map<String, dynamic> m) => MarketSymbol(
    token:     m['token']     as String? ?? '',
    symbol:    m['symbol']    as String? ?? '',
    name:      m['name']      as String? ?? m['symbol'] as String? ?? '',
    exchange:  m['exchange']  as String? ?? 'NSE',
    ltp:       (m['ltp']      as num?)?.toDouble() ?? 0,
    change:    (m['change']   as num?)?.toDouble() ?? 0,
    changePct: (m['changePct'] as num?)?.toDouble() ?? 0,
  );

  @override
  Future<Result<List<MarketSymbol>>> searchSymbols(String query) async {
    try {
      final list = await _remote.searchSymbols(query);
      return Success(list.map((e) => _fromMap(e as Map<String, dynamic>)).toList());
    } catch (_) {
      return const Failure(UnknownException());
    }
  }

  @override
  Future<Result<List<MarketSymbol>>> getIndices() async {
    try {
      final list = await _remote.getIndices();
      return Success(list.map((e) => _fromMap(e as Map<String, dynamic>)).toList());
    } catch (_) {
      return const Failure(UnknownException());
    }
  }

  @override
  Future<Result<MarketSymbol>> getQuote(String token, String exchange) async {
    try {
      final data = await _remote.getQuote(token, exchange);
      return Success(_fromMap(data));
    } catch (_) {
      return const Failure(UnknownException());
    }
  }
}
