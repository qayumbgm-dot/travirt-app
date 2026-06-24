import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/watchlist_storage.dart';
import '../../../market/domain/entities/symbol.dart';

final _storage = WatchlistStorage();

// State: list of saved stub symbols (token/symbol/name/exchange only; prices
// are fetched separately via search when the user opens Trade).
final watchlistProvider =
    AsyncNotifierProvider<WatchlistNotifier, List<Map<String, String>>>(
      WatchlistNotifier.new,
    );

class WatchlistNotifier extends AsyncNotifier<List<Map<String, String>>> {
  @override
  Future<List<Map<String, String>>> build() => _storage.loadAll();

  Future<void> add(MarketSymbol s) async {
    await _storage.add({
      'token':    s.token,
      'symbol':   s.symbol,
      'name':     s.name,
      'exchange': s.exchange,
    });
    state = AsyncData(await _storage.loadAll());
  }

  Future<void> remove(String token) async {
    await _storage.remove(token);
    state = AsyncData(await _storage.loadAll());
  }

  Future<bool> contains(String token) => _storage.contains(token);
}
