import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../../app/navigation/app_router.dart';
import '../../../../app/theme/colors.dart';
import '../../../../app/theme/typography.dart';
import '../../../../app/theme/spacing.dart';
import '../../../../shared/widgets/glass_card.dart';
import '../../../../shared/widgets/indices_ticker.dart';
import '../widgets/equity_curve_chart.dart';
import '../../../../app/di/injection_container.dart';
import '../../domain/entities/portfolio_summary.dart';
import '../../domain/usecases/get_dashboard_usecase.dart';
import '../../../auth/presentation/viewmodels/auth_viewmodel.dart';

final _summaryProvider = FutureProvider<PortfolioSummary>((ref) async {
  final result = await sl<GetDashboardUseCase>().execute();
  return result.when(
    success: (s) => s,
    failure: (e) => throw e,
  );
});

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authViewModelProvider).user;
    final summaryAsync = ref.watch(_summaryProvider);

    return Scaffold(
      backgroundColor: AppColors.base,
      body: RefreshIndicator(
        onRefresh: () => ref.refresh(_summaryProvider.future),
        color: AppColors.primary,
        backgroundColor: AppColors.surface,
        child: CustomScrollView(
          slivers: [
            // ── App Bar ─────────────────────────────────────────────────────
            SliverAppBar(
              expandedHeight: 120,
              floating: true,
              snap: true,
              backgroundColor: AppColors.base,
              flexibleSpace: FlexibleSpaceBar(
                background: Container(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        AppColors.primary.withOpacity(0.08),
                        AppColors.base,
                      ],
                    ),
                  ),
                  padding: const EdgeInsets.fromLTRB(
                    Spacing.xl2, 56, Spacing.xl2, Spacing.lg,
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          Text(
                            'Good ${_greeting()},',
                            style: AppTypography.bodyMd,
                          ),
                          Text(
                            user?.username ?? 'Trader',
                            style: AppTypography.displaySm,
                          ),
                        ],
                      ),
                      GestureDetector(
                        onTap: () => context.go(AppRoutes.profile),
                        child: CircleAvatar(
                          radius: 22,
                          backgroundColor: AppColors.primaryMuted,
                          child: Text(
                            (user?.username ?? 'T')[0].toUpperCase(),
                            style: AppTypography.headingMd.copyWith(
                              color: AppColors.primary,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),

            // ── Indices Ticker ───────────────────────────────────────────────
            const SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.only(bottom: Spacing.md),
                child: IndicesTicker(),
              ),
            ),

            // ── Content ─────────────────────────────────────────────────────
            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: Spacing.xl2),
              sliver: summaryAsync.when(
                data: (summary) => SliverList(
                  delegate: SliverChildListDelegate([
                    _PortfolioCard(summary: summary),
                    const SizedBox(height: Spacing.xl),
                    _StatsRow(summary: summary),
                    const SizedBox(height: Spacing.xl),
                    _QuickActions(user: user),
                    const SizedBox(height: Spacing.xl),
                    const EquityCurveChart(),
                    const SizedBox(height: Spacing.xl),
                    _MarketBadge(mode: summary.marketMode),
                    const SizedBox(height: Spacing.xl4),
                  ]),
                ),
                loading: () => SliverList(
                  delegate: SliverChildListDelegate([
                    const _ShimmerCard(height: 180),
                    const SizedBox(height: Spacing.xl),
                    const _ShimmerCard(height: 100),
                    const SizedBox(height: Spacing.xl),
                    const _ShimmerCard(height: 120),
                  ]),
                ),
                error: (e, _) => SliverToBoxAdapter(
                  child: Center(
                    child: Padding(
                      padding: const EdgeInsets.all(Spacing.xl3),
                      child: Column(children: [
                        const Icon(Icons.wifi_off, size: 48, color: AppColors.muted),
                        const SizedBox(height: Spacing.lg),
                        Text(e.toString(), style: AppTypography.bodyMd,
                            textAlign: TextAlign.center),
                        const SizedBox(height: Spacing.lg),
                        TextButton(
                          onPressed: () => ref.refresh(_summaryProvider),
                          child: const Text('Retry'),
                        ),
                      ]),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _greeting() {
    final h = DateTime.now().hour;
    if (h < 12) return 'morning';
    if (h < 17) return 'afternoon';
    return 'evening';
  }
}

// ── Portfolio Value Card ───────────────────────────────────────────────────────

class _PortfolioCard extends StatelessWidget {
  const _PortfolioCard({required this.summary});
  final PortfolioSummary summary;

  @override
  Widget build(BuildContext context) {
    final fmt = NumberFormat.currency(symbol: '₹', decimalDigits: 2, locale: 'en_IN');
    final pnlColor = summary.isProfit ? AppColors.success : AppColors.danger;

    return GlassCard(
      gradient: LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [
          AppColors.primary.withOpacity(0.15),
          AppColors.surface.withOpacity(0.8),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(Spacing.xl2),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Portfolio Value', style: AppTypography.labelMd),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: Spacing.sm, vertical: Spacing.xs,
                  ),
                  decoration: BoxDecoration(
                    color: summary.isLive
                        ? AppColors.successMuted
                        : AppColors.primaryMuted,
                    borderRadius: BorderRadius.circular(Radius.sm),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 6, height: 6,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: summary.isLive
                              ? AppColors.success
                              : AppColors.primary,
                        ),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        summary.marketMode,
                        style: AppTypography.labelSm.copyWith(
                          color: summary.isLive
                              ? AppColors.success
                              : AppColors.primary,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: Spacing.sm),
            Text(fmt.format(summary.totalValue), style: AppTypography.numericXl),
            const SizedBox(height: Spacing.sm),
            Row(children: [
              Icon(
                summary.isProfit ? Icons.trending_up : Icons.trending_down,
                color: pnlColor, size: 18,
              ),
              const SizedBox(width: Spacing.xs),
              Text(
                '${summary.isProfit ? '+' : ''}${fmt.format(summary.totalPnl)} '
                '(${summary.totalPnlPct.toStringAsFixed(2)}%)',
                style: AppTypography.numericMd.copyWith(color: pnlColor),
              ),
              const Spacer(),
              Text('All time', style: AppTypography.bodySm),
            ]),
            const SizedBox(height: Spacing.lg),
            const Divider(color: AppColors.overlayLight),
            const SizedBox(height: Spacing.lg),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _ValueItem(
                  label: 'Available Cash',
                  value: fmt.format(summary.virtualBalance),
                  color: AppColors.textPrimary,
                ),
                _ValueItem(
                  label: "Today's P&L",
                  value: '${summary.isDayProfit ? '+' : ''}${fmt.format(summary.dayPnl)}',
                  color: summary.isDayProfit ? AppColors.success : AppColors.danger,
                ),
                _ValueItem(
                  label: 'Invested',
                  value: fmt.format(summary.invested),
                  color: AppColors.textSecondary,
                ),
              ],
            ),
          ],
        ),
      ),
    ).animate().fadeIn(duration: 400.ms).slideY(begin: 0.05, end: 0);
  }
}

class _ValueItem extends StatelessWidget {
  const _ValueItem({required this.label, required this.value, required this.color});
  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(label, style: AppTypography.labelSm),
      const SizedBox(height: 2),
      Text(value, style: AppTypography.numericSm.copyWith(color: color)),
    ],
  );
}

// ── Stats Row ─────────────────────────────────────────────────────────────────

class _StatsRow extends StatelessWidget {
  const _StatsRow({required this.summary});
  final PortfolioSummary summary;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _StatCard(
            icon: Icons.pie_chart_outline,
            label: 'Holdings',
            value: summary.holdingsCount.toString(),
            color: AppColors.primary,
          ),
        ),
        const SizedBox(width: Spacing.md),
        Expanded(
          child: _StatCard(
            icon: Icons.emoji_events_outlined,
            label: 'Win Rate',
            value: '${summary.winRate.toStringAsFixed(1)}%',
            color: AppColors.success,
          ),
        ),
      ],
    ).animate(delay: 150.ms).fadeIn().slideY(begin: 0.05, end: 0);
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });
  final IconData icon;
  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) => GlassCard(
    child: Padding(
      padding: const EdgeInsets.all(Spacing.lg),
      child: Row(children: [
        Container(
          width: 40, height: 40,
          decoration: BoxDecoration(
            color: color.withOpacity(0.15),
            borderRadius: BorderRadius.circular(Radius.sm),
          ),
          child: Icon(icon, color: color, size: 20),
        ),
        const SizedBox(width: Spacing.md),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(value, style: AppTypography.numericMd.copyWith(color: color)),
            Text(label, style: AppTypography.labelSm),
          ],
        ),
      ]),
    ),
  );
}

// ── Quick Actions ─────────────────────────────────────────────────────────────

class _QuickActions extends StatelessWidget {
  const _QuickActions({required this.user});
  final dynamic user;

  @override
  Widget build(BuildContext context) {
    final actions = [
      (icon: Icons.candlestick_chart, label: 'Trade', route: AppRoutes.trade, color: AppColors.primary),
      (icon: Icons.receipt_long, label: 'Orders', route: AppRoutes.orders, color: AppColors.warning),
      (icon: Icons.account_balance_wallet_outlined, label: 'Funds', route: AppRoutes.funds, color: AppColors.success),
      (icon: Icons.leaderboard, label: 'Ranks', route: AppRoutes.leaderboard, color: AppColors.info),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Quick Actions', style: AppTypography.headingSm),
        const SizedBox(height: Spacing.md),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: actions.map((a) => _ActionBtn(
            icon: a.icon,
            label: a.label,
            color: a.color,
            onTap: () => context.go(a.route),
          )).toList(),
        ),
      ],
    ).animate(delay: 250.ms).fadeIn();
  }
}

class _ActionBtn extends StatelessWidget {
  const _ActionBtn({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Column(
      children: [
        Container(
          width: 56, height: 56,
          decoration: BoxDecoration(
            color: color.withOpacity(0.12),
            borderRadius: BorderRadius.circular(Radius.lg),
            border: Border.all(color: color.withOpacity(0.3)),
          ),
          child: Icon(icon, color: color, size: 24),
        ),
        const SizedBox(height: Spacing.xs),
        Text(label, style: AppTypography.labelSm),
      ],
    ),
  );
}

// ── Market Mode Badge ──────────────────────────────────────────────────────────

class _MarketBadge extends StatelessWidget {
  const _MarketBadge({required this.mode});
  final String mode;

  @override
  Widget build(BuildContext context) {
    final isLive = mode == 'LIVE';
    return GlassCard(
      borderColor: isLive ? AppColors.success.withOpacity(0.4) : null,
      child: Padding(
        padding: const EdgeInsets.all(Spacing.lg),
        child: Row(
          children: [
            Container(
              width: 10, height: 10,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: isLive ? AppColors.success : AppColors.primary,
                boxShadow: [
                  BoxShadow(
                    color: (isLive ? AppColors.success : AppColors.primary)
                        .withOpacity(0.5),
                    blurRadius: 8,
                    spreadRadius: 2,
                  ),
                ],
              ),
            ),
            const SizedBox(width: Spacing.md),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isLive ? 'Live Market Feed Active' : 'Simulation Mode',
                  style: AppTypography.labelLg.copyWith(
                    color: isLive ? AppColors.success : AppColors.primary,
                  ),
                ),
                Text(
                  isLive
                      ? 'Real-time prices via Alice Blue'
                      : 'Prices delayed — connect broker for live data',
                  style: AppTypography.bodySm,
                ),
              ],
            ),
          ],
        ),
      ),
    ).animate(delay: 350.ms).fadeIn();
  }
}

// ── Shimmer Placeholder ───────────────────────────────────────────────────────

class _ShimmerCard extends StatelessWidget {
  const _ShimmerCard({required this.height});
  final double height;

  @override
  Widget build(BuildContext context) => Container(
    height: height,
    decoration: BoxDecoration(
      color: AppColors.surface,
      borderRadius: BorderRadius.circular(Radius.lg),
    ),
  ).animate(onPlay: (c) => c.repeat()).shimmer(
    duration: 1200.ms,
    color: AppColors.overlayLight,
  );
}
