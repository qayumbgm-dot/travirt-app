import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../../app/navigation/app_router.dart';
import '../../../../app/theme/colors.dart';
import '../../../../app/theme/typography.dart';
import '../../../../app/theme/spacing.dart';
import '../../../../shared/widgets/glass_card.dart';
import '../../../../app/di/injection_container.dart';
import '../../domain/entities/holding.dart';
import '../../domain/usecases/get_portfolio_usecase.dart';
import '../widgets/allocation_chart.dart';
import '../../../../shared/widgets/shimmer_box.dart';

final _holdingsProvider = FutureProvider<List<Holding>>((ref) async {
  final result = await sl<GetPortfolioUseCase>().execute();
  return result.when(success: (h) => h, failure: (e) => throw e);
});

class PortfolioScreen extends ConsumerWidget {
  const PortfolioScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final holdingsAsync = ref.watch(_holdingsProvider);
    final fmt = NumberFormat.currency(symbol: '₹', decimalDigits: 2, locale: 'en_IN');

    return Scaffold(
      backgroundColor: AppColors.base,
      appBar: AppBar(
        title: const Text('Portfolio'),
        actions: [
          IconButton(
            icon: const Icon(Icons.bar_chart),
            tooltip: 'Trade Stats',
            onPressed: () => context.go(AppRoutes.tradeStats),
          ),
          IconButton(
            icon: const Icon(Icons.calendar_month_outlined),
            tooltip: 'P&L Calendar',
            onPressed: () => context.go(AppRoutes.pnlCalendar),
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.refresh(_holdingsProvider),
          ),
        ],
      ),
      body: holdingsAsync.when(
        data: (holdings) => holdings.isEmpty
            ? const _EmptyHoldings()
            : ListView.separated(
                padding: const EdgeInsets.all(Spacing.xl2),
                itemCount: holdings.length + 1,
                separatorBuilder: (_, __) => const SizedBox(height: Spacing.md),
                itemBuilder: (_, i) {
                  if (i == 0) {
                    return Padding(
                      padding: const EdgeInsets.only(bottom: Spacing.xl),
                      child: AllocationChart(holdings: holdings),
                    );
                  }
                  final idx = i - 1;
                  final h = holdings[idx];
                  final color = h.isProfit ? AppColors.success : AppColors.danger;
                  return GlassCard(
                    child: Padding(
                      padding: const EdgeInsets.all(Spacing.lg),
                      child: Row(children: [
                        Container(
                          width: 44, height: 44,
                          decoration: BoxDecoration(
                            color: AppColors.primaryMuted,
                            borderRadius: BorderRadius.circular(Radius.sm),
                          ),
                          child: Center(
                            child: Text(h.symbol[0],
                                style: AppTypography.headingSm
                                    .copyWith(color: AppColors.primary)),
                          ),
                        ),
                        const SizedBox(width: Spacing.md),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(h.symbol, style: AppTypography.headingSm),
                              Text('${h.quantity} shares @ ${fmt.format(h.avgPrice)}',
                                  style: AppTypography.bodySm),
                            ],
                          ),
                        ),
                        Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                          Text(fmt.format(h.currentValue),
                              style: AppTypography.numericMd),
                          Text(
                            '${h.isProfit ? '+' : ''}${fmt.format(h.pnl)} '
                            '(${h.pnlPct.toStringAsFixed(2)}%)',
                            style: AppTypography.numericSm.copyWith(color: color),
                          ),
                        ]),
                      ]),
                    ),
                  );
                },
              ),
        loading: () => const ShimmerList(count: 5, cardHeight: 80),
        error: (e, _) => Center(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            const Icon(Icons.error_outline, size: 48, color: AppColors.danger),
            const SizedBox(height: Spacing.lg),
            Text(e.toString(), style: AppTypography.bodyMd),
            TextButton(
              onPressed: () => ref.refresh(_holdingsProvider),
              child: const Text('Retry'),
            ),
          ]),
        ),
      ),
    );
  }
}

class _EmptyHoldings extends StatelessWidget {
  const _EmptyHoldings();

  @override
  Widget build(BuildContext context) => Center(
    child: Column(mainAxisSize: MainAxisSize.min, children: [
      const Icon(Icons.pie_chart_outline, size: 64, color: AppColors.muted),
      const SizedBox(height: Spacing.lg),
      const Text('No Holdings Yet', style: AppTypography.headingMd),
      const SizedBox(height: Spacing.sm),
      Text('Start trading to build your portfolio',
          style: AppTypography.bodyMd),
    ]),
  );
}
