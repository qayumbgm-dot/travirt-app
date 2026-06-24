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
import '../viewmodels/watchlist_viewmodel.dart';

// Search provider scoped to the add-symbol sheet
final _addSearchProvider = StateProvider<String>((ref) => '');
final _addResultsProvider =
    FutureProvider.family<List<MarketSymbol>, String>((ref, q) async {
  if (q.length < 2) return [];
  final r = await sl<SearchSymbolsUseCase>().execute(q);
  return r.when(success: (s) => s, failure: (_) => []);
});

class WatchlistScreen extends ConsumerWidget {
  const WatchlistScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(watchlistProvider);

    return Scaffold(
      backgroundColor: AppColors.base,
      appBar: AppBar(
        title: const Text('Watchlist'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            tooltip: 'Add symbol',
            onPressed: () => _showAddSheet(context, ref),
          ),
        ],
      ),
      body: async.when(
        loading: () => const ShimmerList(),
        error: (e, _) => Center(
          child: Text(e.toString(), style: AppTypography.bodyMd),
        ),
        data: (items) => items.isEmpty
            ? _EmptyWatchlist(onAdd: () => _showAddSheet(context, ref))
            : ListView.separated(
                padding: const EdgeInsets.all(Spacing.xl2),
                itemCount: items.length,
                separatorBuilder: (_, __) => const SizedBox(height: Spacing.md),
                itemBuilder: (_, i) => _WatchlistTile(item: items[i]),
              ),
      ),
    );
  }

  void _showAddSheet(BuildContext context, WidgetRef ref) {
    // Reset search when sheet opens
    ref.read(_addSearchProvider.notifier).state = '';
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(Radius.xl2)),
      ),
      builder: (_) => ProviderScope(
        parent: ProviderScope.containerOf(context),
        child: const _AddSymbolSheet(),
      ),
    );
  }
}

class _WatchlistTile extends ConsumerWidget {
  const _WatchlistTile({required this.item});
  final Map<String, String> item;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Dismissible(
      key: ValueKey(item['token']),
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: Spacing.xl2),
        decoration: BoxDecoration(
          color: AppColors.danger.withOpacity(0.2),
          borderRadius: BorderRadius.circular(Radius.lg),
        ),
        child: const Icon(Icons.delete_outline, color: AppColors.danger),
      ),
      onDismissed: (_) =>
          ref.read(watchlistProvider.notifier).remove(item['token']!),
      child: GlassCard(
        onTap: () => context.go(AppRoutes.orderTicket, extra: item['symbol']),
        child: Padding(
          padding: const EdgeInsets.all(Spacing.lg),
          child: Row(children: [
            Container(
              width: 40, height: 40,
              decoration: BoxDecoration(
                color: AppColors.primaryMuted,
                borderRadius: BorderRadius.circular(Radius.sm),
              ),
              child: Center(
                child: Text(
                  (item['symbol'] ?? '?')[0],
                  style: AppTypography.headingSm.copyWith(color: AppColors.primary),
                ),
              ),
            ),
            const SizedBox(width: Spacing.md),
            Expanded(child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(item['symbol'] ?? '', style: AppTypography.headingSm),
                Text(item['name'] ?? '', style: AppTypography.bodySm,
                    overflow: TextOverflow.ellipsis),
              ],
            )),
            Container(
              padding: const EdgeInsets.symmetric(
                  horizontal: Spacing.sm, vertical: Spacing.xs),
              decoration: BoxDecoration(
                color: AppColors.overlayLight,
                borderRadius: BorderRadius.circular(Radius.xs),
              ),
              child: Text(item['exchange'] ?? '',
                  style: AppTypography.labelSm),
            ),
          ]),
        ),
      ),
    );
  }
}

class _EmptyWatchlist extends StatelessWidget {
  const _EmptyWatchlist({required this.onAdd});
  final VoidCallback onAdd;

  @override
  Widget build(BuildContext context) => Center(
    child: Column(mainAxisSize: MainAxisSize.min, children: [
      const Icon(Icons.bookmark_border, size: 64, color: AppColors.muted),
      const SizedBox(height: Spacing.lg),
      const Text('No symbols saved', style: AppTypography.headingMd),
      const SizedBox(height: Spacing.sm),
      Text('Tap + to add symbols to your watchlist',
          style: AppTypography.bodyMd),
      const SizedBox(height: Spacing.xl),
      TextButton.icon(
        onPressed: onAdd,
        icon: const Icon(Icons.add),
        label: const Text('Add Symbol'),
      ),
    ]),
  );
}

// ── Add Symbol Bottom Sheet ───────────────────────────────────────────────────

class _AddSymbolSheet extends ConsumerWidget {
  const _AddSymbolSheet();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final query = ref.watch(_addSearchProvider);
    final resultsAsync = ref.watch(_addResultsProvider(query));

    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.75,
      maxChildSize: 0.95,
      minChildSize: 0.5,
      builder: (_, scrollCtrl) => Column(
        children: [
          // Handle
          Center(
            child: Container(
              margin: const EdgeInsets.symmetric(vertical: Spacing.md),
              width: 40, height: 4,
              decoration: BoxDecoration(
                color: AppColors.overlayLight,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(
                Spacing.xl2, 0, Spacing.xl2, Spacing.lg),
            child: TextField(
              autofocus: true,
              onChanged: (v) =>
                  ref.read(_addSearchProvider.notifier).state = v,
              style: AppTypography.bodyLg,
              decoration: const InputDecoration(
                hintText: 'Search symbol…',
                prefixIcon: Icon(Icons.search),
              ),
            ),
          ),
          Expanded(
            child: query.length < 2
                ? Center(
                    child: Text('Type at least 2 characters',
                        style: AppTypography.bodySm),
                  )
                : resultsAsync.when(
                    loading: () => const ShimmerList(count: 5, cardHeight: 56),
                    error: (e, _) => Center(
                        child: Text(e.toString(),
                            style: AppTypography.bodyMd)),
                    data: (symbols) => symbols.isEmpty
                        ? Center(
                            child: Text('No results',
                                style: AppTypography.bodyMd))
                        : ListView.separated(
                            controller: scrollCtrl,
                            padding: const EdgeInsets.symmetric(
                                horizontal: Spacing.xl2),
                            itemCount: symbols.length,
                            separatorBuilder: (_, __) =>
                                const Divider(color: AppColors.overlayLight),
                            itemBuilder: (_, i) =>
                                _AddResultTile(symbol: symbols[i]),
                          ),
                  ),
          ),
        ],
      ),
    );
  }
}

class _AddResultTile extends ConsumerWidget {
  const _AddResultTile({required this.symbol});
  final MarketSymbol symbol;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      title: Text(symbol.symbol, style: AppTypography.headingSm),
      subtitle: Text(symbol.name, style: AppTypography.bodySm),
      trailing: IconButton(
        icon: const Icon(Icons.add_circle_outline, color: AppColors.primary),
        onPressed: () async {
          await ref.read(watchlistProvider.notifier).add(symbol);
          if (context.mounted) Navigator.pop(context);
        },
      ),
    );
  }
}
