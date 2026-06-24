import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../../app/theme/colors.dart';
import '../../../../app/theme/typography.dart';
import '../../../../app/theme/spacing.dart';
import '../../../../shared/widgets/glass_card.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/constants/api_constants.dart';
import '../../../../app/di/injection_container.dart';
import '../../../../shared/widgets/shimmer_box.dart';

final _tradeStatsProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final res = await sl<ApiClient>().get(ApiConstants.tradeStats);
  return res.data as Map<String, dynamic>;
});

class TradeStatsScreen extends ConsumerWidget {
  const TradeStatsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(_tradeStatsProvider);
    final fmt = NumberFormat.currency(symbol: '₹', decimalDigits: 2, locale: 'en_IN');

    return Scaffold(
      backgroundColor: AppColors.base,
      appBar: AppBar(
        title: const Text('Trade Statistics'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.refresh(_tradeStatsProvider),
          ),
        ],
      ),
      body: async.when(
        loading: () => ListView(
          padding: const EdgeInsets.all(Spacing.xl2),
          children: [
            const ShimmerBox(height: 180),
            const SizedBox(height: Spacing.xl),
            const ShimmerBox(height: 20, width: 120),
            const SizedBox(height: Spacing.md),
            Row(children: const [
              Expanded(child: ShimmerBox(height: 88)),
              SizedBox(width: Spacing.md),
              Expanded(child: ShimmerBox(height: 88)),
            ]),
            const SizedBox(height: Spacing.md),
            Row(children: const [
              Expanded(child: ShimmerBox(height: 88)),
              SizedBox(width: Spacing.md),
              Expanded(child: ShimmerBox(height: 88)),
            ]),
            const SizedBox(height: Spacing.xl),
            const ShimmerBox(height: 20, width: 100),
            const SizedBox(height: Spacing.md),
            const ShimmerBox(height: 160),
          ],
        ),
        error: (e, _) => EmptyState(
          type: EmptyStateType.error,
          message: e.toString(),
          onAction: () => ref.refresh(_tradeStatsProvider),
        ),
        data: (stats) {
          final totalTrades  = (stats['totalTrades']  as num?)?.toInt()    ?? 0;
          final winTrades    = (stats['winTrades']    as num?)?.toInt()    ?? 0;
          final lossTrades   = (stats['lossTrades']   as num?)?.toInt()    ?? 0;
          final winRate      = (stats['winRate']      as num?)?.toDouble() ?? 0;
          final avgProfit    = (stats['avgProfit']    as num?)?.toDouble() ?? 0;
          final avgLoss      = (stats['avgLoss']      as num?)?.toDouble() ?? 0;
          final bestTrade    = (stats['bestTrade']    as num?)?.toDouble() ?? 0;
          final worstTrade   = (stats['worstTrade']   as num?)?.toDouble() ?? 0;
          final profitFactor = (stats['profitFactor'] as num?)?.toDouble() ?? 0;
          final avgHoldMins  = (stats['avgHoldingMinutes'] as num?)?.toInt() ?? 0;
          final streak       = (stats['currentStreak'] as num?)?.toInt()  ?? 0;
          final bestStreak   = (stats['bestStreak']   as num?)?.toInt()   ?? 0;
          final isWinStreak  = (stats['isWinStreak']  as bool?) ?? true;

          if (totalTrades == 0) {
            return const EmptyState(
              type: EmptyStateType.empty,
              title: 'No trades yet',
              message: 'Place your first trade to see statistics.',
            );
          }

          return ListView(
            padding: const EdgeInsets.all(Spacing.xl2),
            children: [
              // Win rate hero
              GlassCard(
                gradient: LinearGradient(
                  colors: [AppColors.primary.withOpacity(0.12), Colors.transparent],
                ),
                child: Padding(
                  padding: const EdgeInsets.all(Spacing.xl2),
                  child: Column(children: [
                    Text('Win Rate', style: AppTypography.labelMd),
                    const SizedBox(height: Spacing.sm),
                    Text(
                      '${winRate.toStringAsFixed(1)}%',
                      style: AppTypography.numericXl.copyWith(
                        color: winRate >= 50 ? AppColors.success : AppColors.danger,
                        fontSize: 48,
                      ),
                    ),
                    const SizedBox(height: Spacing.md),
                    _WinLossBar(winTrades: winTrades, lossTrades: lossTrades),
                    const SizedBox(height: Spacing.md),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        _WinLossCount(count: winTrades, label: 'Wins', color: AppColors.success),
                        const SizedBox(width: Spacing.xl3),
                        _WinLossCount(count: lossTrades, label: 'Losses', color: AppColors.danger),
                        const SizedBox(width: Spacing.xl3),
                        _WinLossCount(count: totalTrades, label: 'Total', color: AppColors.muted),
                      ],
                    ),
                  ]),
                ),
              ),

              const SizedBox(height: Spacing.xl),
              Text('Performance', style: AppTypography.headingSm),
              const SizedBox(height: Spacing.md),

              Row(children: [
                Expanded(child: _StatCard(
                  label: 'Best Trade',
                  value: fmt.format(bestTrade),
                  color: AppColors.success,
                  icon: Icons.trending_up,
                )),
                const SizedBox(width: Spacing.md),
                Expanded(child: _StatCard(
                  label: 'Worst Trade',
                  value: fmt.format(worstTrade),
                  color: AppColors.danger,
                  icon: Icons.trending_down,
                )),
              ]),
              const SizedBox(height: Spacing.md),
              Row(children: [
                Expanded(child: _StatCard(
                  label: 'Avg Profit',
                  value: fmt.format(avgProfit),
                  color: AppColors.success,
                  icon: Icons.add_circle_outline,
                )),
                const SizedBox(width: Spacing.md),
                Expanded(child: _StatCard(
                  label: 'Avg Loss',
                  value: fmt.format(avgLoss.abs()),
                  color: AppColors.danger,
                  icon: Icons.remove_circle_outline,
                )),
              ]),

              const SizedBox(height: Spacing.xl),
              Text('Risk Metrics', style: AppTypography.headingSm),
              const SizedBox(height: Spacing.md),

              GlassCard(
                child: Column(children: [
                  _MetricRow('Profit Factor', profitFactor.toStringAsFixed(2),
                      color: profitFactor >= 1.5
                          ? AppColors.success
                          : profitFactor >= 1.0
                              ? AppColors.warning
                              : AppColors.danger),
                  const Divider(color: AppColors.overlayLight, height: 1),
                  _MetricRow('Avg Holding Time', _formatMins(avgHoldMins)),
                  const Divider(color: AppColors.overlayLight, height: 1),
                  _MetricRow(
                    'Current Streak',
                    '${streak >= 0 ? '+' : ''}$streak ${isWinStreak ? 'wins' : 'losses'}',
                    color: isWinStreak ? AppColors.success : AppColors.danger,
                  ),
                  const Divider(color: AppColors.overlayLight, height: 1),
                  _MetricRow('Best Win Streak', '$bestStreak wins',
                      color: AppColors.success),
                ]),
              ),

              const SizedBox(height: Spacing.xl4),
            ],
          );
        },
      ),
    );
  }

  String _formatMins(int mins) {
    if (mins < 60)  return '${mins}m';
    if (mins < 1440) return '${(mins / 60).toStringAsFixed(1)}h';
    return '${(mins / 1440).toStringAsFixed(1)}d';
  }
}

class _WinLossBar extends StatelessWidget {
  const _WinLossBar({required this.winTrades, required this.lossTrades});
  final int winTrades;
  final int lossTrades;

  @override
  Widget build(BuildContext context) {
    final total = winTrades + lossTrades;
    if (total == 0) return const SizedBox.shrink();
    final winFrac = winTrades / total;

    return ClipRRect(
      borderRadius: BorderRadius.circular(Radius.full),
      child: SizedBox(
        height: 8,
        child: Row(children: [
          Flexible(
            flex: (winFrac * 100).round(),
            child: Container(color: AppColors.success),
          ),
          Flexible(
            flex: 100 - (winFrac * 100).round(),
            child: Container(color: AppColors.danger),
          ),
        ]),
      ),
    );
  }
}

class _WinLossCount extends StatelessWidget {
  const _WinLossCount({required this.count, required this.label, required this.color});
  final int count;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) => Column(children: [
    Text('$count', style: AppTypography.numericMd.copyWith(color: color)),
    Text(label, style: AppTypography.labelSm),
  ]);
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.label, required this.value,
    required this.color, required this.icon,
  });
  final String label;
  final String value;
  final Color color;
  final IconData icon;

  @override
  Widget build(BuildContext context) => GlassCard(
    child: Padding(
      padding: const EdgeInsets.all(Spacing.lg),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Icon(icon, color: color, size: 16),
          const SizedBox(width: Spacing.xs),
          Text(label, style: AppTypography.labelSm),
        ]),
        const SizedBox(height: Spacing.sm),
        Text(value,
            style: AppTypography.numericSm.copyWith(color: color),
            overflow: TextOverflow.ellipsis),
      ]),
    ),
  );
}

class _MetricRow extends StatelessWidget {
  const _MetricRow(this.label, this.value, {this.color});
  final String label;
  final String value;
  final Color? color;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(
        horizontal: Spacing.lg, vertical: Spacing.md),
    child: Row(children: [
      Text(label, style: AppTypography.bodyMd),
      const Spacer(),
      Text(value,
          style: AppTypography.numericMd
              .copyWith(color: color ?? AppColors.textPrimary)),
    ]),
  );
}
