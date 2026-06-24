import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../app/navigation/app_router.dart';
import '../../../../app/theme/colors.dart';
import '../../../../app/theme/typography.dart';
import '../../../../app/theme/spacing.dart';
import '../../../../shared/widgets/glass_card.dart';
import '../../../../shared/widgets/shimmer_box.dart';
import '../../../../app/di/injection_container.dart';
import '../../../market/domain/entities/symbol.dart';
import '../../../market/domain/usecases/search_symbols_usecase.dart';
import '../../../watchlist/presentation/viewmodels/watchlist_viewmodel.dart';
import '../../data/search_history_storage.dart';

final _searchProvider        = StateProvider<String>((ref) => '');
final _searchFocusedProvider = StateProvider<bool>((ref) => false);

final _historyProvider = FutureProvider<List<String>>((ref) {
  return SearchHistoryStorage().load();
});

final _searchResultsProvider =
    FutureProvider.family<List<MarketSymbol>, String>((ref, query) async {
  if (query.length < 2) return [];
  final result = await sl<SearchSymbolsUseCase>().execute(query);
  return result.when(success: (s) => s, failure: (_) => []);
});

class TradeScreen extends ConsumerStatefulWidget {
  const TradeScreen({super.key});

  @override
  ConsumerState<TradeScreen> createState() => _TradeScreenState();
}

class _TradeScreenState extends ConsumerState<TradeScreen> {
  final _ctrl  = TextEditingController();
  final _focus = FocusNode();

  @override
  void dispose() {
    _ctrl.dispose();
    _focus.dispose();
    super.dispose();
  }

  void _onSubmit(String query) async {
    if (query.trim().length >= 2) {
      await SearchHistoryStorage().add(query.trim());
      ref.invalidate(_historyProvider);
    }
  }

  void _selectHistory(String query) {
    _ctrl.text = query;
    ref.read(_searchProvider.notifier).state = query;
    _focus.unfocus();
  }

  void _clearQuery() {
    _ctrl.clear();
    ref.read(_searchProvider.notifier).state = '';
  }

  @override
  Widget build(BuildContext context) {
    final query       = ref.watch(_searchProvider);
    final resultsAsync = ref.watch(_searchResultsProvider(query));

    return Scaffold(
      backgroundColor: AppColors.base,
      appBar: AppBar(
        title: const Text('Trade'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(64),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(
              Spacing.xl2, 0, Spacing.xl2, Spacing.lg,
            ),
            child: TextField(
              controller: _ctrl,
              focusNode: _focus,
              onChanged: (v) =>
                  ref.read(_searchProvider.notifier).state = v,
              onSubmitted: _onSubmit,
              onTap: () => ref.read(_searchFocusedProvider.notifier).state = true,
              style: AppTypography.bodyLg,
              decoration: InputDecoration(
                hintText: 'Search symbols…',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: query.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: _clearQuery,
                      )
                    : null,
              ),
            ),
          ),
        ),
      ),
      body: query.length < 2
          ? _WatchlistOrHistory(onHistoryTap: _selectHistory)
          : resultsAsync.when(
              data: (symbols) => symbols.isEmpty
                  ? const Center(
                      child: Text('No results', style: AppTypography.bodyMd))
                  : ListView.builder(
                      padding: const EdgeInsets.all(Spacing.xl2),
                      itemCount: symbols.length,
                      itemBuilder: (_, i) => _SymbolTile(
                        symbol: symbols[i],
                        onTap: () {
                          _onSubmit(symbols[i].symbol);
                          context.go(
                            AppRoutes.orderTicket,
                            extra: symbols[i].symbol,
                          );
                        },
                      ),
                    ),
              loading: () => const ShimmerList(),
              error: (e, _) =>
                  Center(child: Text(e.toString(), style: AppTypography.bodyMd)),
            ),
    );
  }
}

// ── Symbol tile ────────────────────────────────────────────────────────────

class _SymbolTile extends ConsumerWidget {
  const _SymbolTile({required this.symbol, this.onTap});
  final MarketSymbol symbol;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final color = symbol.isUp ? AppColors.success : AppColors.danger;
    return Padding(
      padding: const EdgeInsets.only(bottom: Spacing.md),
      child: GlassCard(
        onTap: onTap ??
            () => context.go(AppRoutes.orderTicket, extra: symbol.symbol),
        child: Padding(
          padding: const EdgeInsets.all(Spacing.lg),
          child: Row(children: [
            Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(symbol.symbol, style: AppTypography.headingSm),
                    Text(symbol.name,
                        style: AppTypography.bodyMd,
                        overflow: TextOverflow.ellipsis),
                  ]),
            ),
            Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
              Text('₹${symbol.ltp.toStringAsFixed(2)}',
                  style: AppTypography.numericMd),
              Row(mainAxisSize: MainAxisSize.min, children: [
                Icon(
                    symbol.isUp
                        ? Icons.arrow_drop_up
                        : Icons.arrow_drop_down,
                    color: color,
                    size: 16),
                Text(
                  '${symbol.changePct.toStringAsFixed(2)}%',
                  style: AppTypography.numericSm.copyWith(color: color),
                ),
              ]),
            ]),
            const SizedBox(width: Spacing.sm),
            GestureDetector(
              onTap: () async {
                final notifier = ref.read(watchlistProvider.notifier);
                final inList = await notifier.contains(symbol.token);
                if (inList) {
                  await notifier.remove(symbol.token);
                } else {
                  await notifier.add(symbol);
                }
              },
              child: ref.watch(watchlistProvider).maybeWhen(
                    data: (items) {
                      final saved =
                          items.any((m) => m['token'] == symbol.token);
                      return Icon(
                        saved ? Icons.bookmark : Icons.bookmark_border,
                        color:
                            saved ? AppColors.primary : AppColors.muted,
                        size: 20,
                      );
                    },
                    orElse: () => const Icon(Icons.bookmark_border,
                        color: AppColors.muted, size: 20),
                  ),
            ),
          ]),
        ),
      ),
    );
  }
}

// ── Watchlist preview + search history ────────────────────────────────────

class _WatchlistOrHistory extends ConsumerWidget {
  const _WatchlistOrHistory({required this.onHistoryTap});
  final ValueChanged<String> onHistoryTap;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final watchAsync   = ref.watch(watchlistProvider);
    final historyAsync = ref.watch(_historyProvider);

    final history = historyAsync.valueOrNull ?? [];

    return watchAsync.when(
      loading: () => const ShimmerList(),
      error: (_, __) => _SearchHint(history: history, onTap: onHistoryTap),
      data: (items) => items.isEmpty && history.isEmpty
          ? _SearchHint(history: history, onTap: onHistoryTap)
          : CustomScrollView(
              slivers: [
                // Search history
                if (history.isNotEmpty) ...[
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(
                          Spacing.xl2, Spacing.lg, Spacing.xl2, Spacing.sm),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('Recent Searches',
                              style: AppTypography.labelMd
                                  .copyWith(color: AppColors.muted)),
                          GestureDetector(
                            onTap: () async {
                              await SearchHistoryStorage().clear();
                              ref.invalidate(_historyProvider);
                            },
                            child: Text('Clear',
                                style: AppTypography.labelSm
                                    .copyWith(color: AppColors.danger)),
                          ),
                        ],
                      ),
                    ),
                  ),
                  SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (_, i) => _HistoryTile(
                        query: history[i],
                        onTap: () => onHistoryTap(history[i]),
                        onRemove: () async {
                          await SearchHistoryStorage().remove(history[i]);
                          ref.invalidate(_historyProvider);
                        },
                      ),
                      childCount: history.length,
                    ),
                  ),
                  const SliverToBoxAdapter(
                      child: SizedBox(height: Spacing.xl)),
                ],

                // Watchlist
                if (items.isNotEmpty) ...[
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(
                          Spacing.xl2, Spacing.sm, Spacing.xl2, Spacing.md),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('Watchlist',
                              style: AppTypography.headingSm),
                          TextButton(
                            onPressed: () =>
                                context.go(AppRoutes.watchlist),
                            child: const Text('Manage'),
                          ),
                        ],
                      ),
                    ),
                  ),
                  SliverPadding(
                    padding: const EdgeInsets.symmetric(
                        horizontal: Spacing.xl2),
                    sliver: SliverList(
                      delegate: SliverChildBuilderDelegate(
                        (_, i) {
                          final item = items[i];
                          return Padding(
                            padding:
                                const EdgeInsets.only(bottom: Spacing.md),
                            child: GlassCard(
                              onTap: () => context.go(
                                AppRoutes.orderTicket,
                                extra: item['symbol'],
                              ),
                              child: Padding(
                                padding:
                                    const EdgeInsets.all(Spacing.lg),
                                child: Row(children: [
                                  Container(
                                    width: 40,
                                    height: 40,
                                    decoration: BoxDecoration(
                                      color: AppColors.primaryMuted,
                                      borderRadius:
                                          BorderRadius.circular(Radius.sm),
                                    ),
                                    child: Center(
                                      child: Text(
                                        (item['symbol'] ?? '?')[0],
                                        style: AppTypography.headingSm
                                            .copyWith(
                                                color: AppColors.primary),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: Spacing.md),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(item['symbol'] ?? '',
                                            style:
                                                AppTypography.headingSm),
                                        Text(item['name'] ?? '',
                                            style: AppTypography.bodySm,
                                            overflow:
                                                TextOverflow.ellipsis),
                                      ],
                                    ),
                                  ),
                                  const Icon(Icons.chevron_right,
                                      color: AppColors.muted, size: 18),
                                ]),
                              ),
                            ),
                          );
                        },
                        childCount: items.length,
                      ),
                    ),
                  ),
                ],

                // Fallback hint when both empty
                if (items.isEmpty && history.isEmpty)
                  SliverFillRemaining(
                    child: _SearchHint(
                        history: const [], onTap: onHistoryTap),
                  ),
              ],
            ),
    );
  }
}

class _HistoryTile extends StatelessWidget {
  const _HistoryTile({
    required this.query,
    required this.onTap,
    required this.onRemove,
  });
  final String query;
  final VoidCallback onTap;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) => ListTile(
        contentPadding:
            const EdgeInsets.symmetric(horizontal: Spacing.xl2),
        leading: const Icon(Icons.history, color: AppColors.muted, size: 20),
        title: Text(query, style: AppTypography.bodyMd),
        trailing: IconButton(
          icon: const Icon(Icons.close, size: 16, color: AppColors.muted),
          onPressed: onRemove,
        ),
        onTap: onTap,
      );
}

class _SearchHint extends StatelessWidget {
  const _SearchHint({required this.history, required this.onTap});
  final List<String> history;
  final ValueChanged<String> onTap;

  @override
  Widget build(BuildContext context) => Center(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          const Icon(Icons.search, size: 64, color: AppColors.muted),
          const SizedBox(height: Spacing.lg),
          Text('Search for a symbol to trade',
              style: AppTypography.bodyMd),
          const SizedBox(height: Spacing.sm),
          Text('e.g. RELIANCE, NIFTY, INFY',
              style: AppTypography.bodySm),
        ]),
      );
}
