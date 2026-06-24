import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../../app/di/injection_container.dart';
import '../../../../app/theme/colors.dart';
import '../../../../app/theme/typography.dart';
import '../../../../app/theme/spacing.dart';
import '../../../../shared/widgets/glass_card.dart';
import '../../../../shared/widgets/shimmer_box.dart';
import '../../../../shared/widgets/travirt_button.dart';
import '../../../auth/presentation/viewmodels/auth_viewmodel.dart';
import '../../../trade/domain/entities/order.dart';
import '../../../trade/domain/usecases/get_positions_usecase.dart';

final _positionsForFundsProvider = FutureProvider<List<Position>>((ref) async {
  final result = await sl<GetPositionsUseCase>().execute();
  return result.when(success: (p) => p, failure: (_) => []);
});

class FundsScreen extends ConsumerWidget {
  const FundsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user    = ref.watch(authViewModelProvider).user;
    final posAsync = ref.watch(_positionsForFundsProvider);
    final fmt     = NumberFormat.currency(symbol: '₹', decimalDigits: 2, locale: 'en_IN');

    final available = user?.virtualBalance ?? 0.0;
    final pnl       = user?.totalPnl ?? 0.0;

    final invested = posAsync.maybeWhen(
      data: (positions) => positions.fold<double>(
        0.0, (sum, p) => sum + (p.avgPrice * p.quantity.abs())),
      orElse: () => 0.0,
    );

    final total = available + invested + (pnl > 0 ? pnl : 0);

    return Scaffold(
      backgroundColor: AppColors.base,
      appBar: AppBar(title: const Text('Funds')),
      body: ListView(
        padding: const EdgeInsets.all(Spacing.xl2),
        children: [
          // ── Balance hero ──────────────────────────────────────────────────
          GlassCard(
            gradient: LinearGradient(
              colors: [AppColors.primary.withOpacity(0.15), Colors.transparent],
            ),
            child: Padding(
              padding: const EdgeInsets.all(Spacing.xl2),
              child: Column(children: [
                Text('Available Balance', style: AppTypography.labelMd),
                const SizedBox(height: Spacing.sm),
                Text(
                  fmt.format(available),
                  style: AppTypography.numericXl,
                ),
                const SizedBox(height: Spacing.xl),
                Row(children: [
                  Expanded(
                    child: TravirtButton(
                      label: 'Add Funds',
                      icon: Icons.add,
                      onPressed: () => _showFundsDialog(context, true),
                    ),
                  ),
                  const SizedBox(width: Spacing.md),
                  Expanded(
                    child: TravirtButton(
                      label: 'Withdraw',
                      icon: Icons.arrow_downward,
                      variant: ButtonVariant.outline,
                      onPressed: () => _showFundsDialog(context, false),
                    ),
                  ),
                ]),
              ]),
            ),
          ),

          const SizedBox(height: Spacing.xl2),

          // ── Donut chart ───────────────────────────────────────────────────
          posAsync.when(
            data: (_) => _FundsChart(
              available: available,
              invested: invested,
              pnl: pnl,
              total: total,
              fmt: fmt,
            ),
            loading: () => const ShimmerBox(height: 220),
            error: (_, __) => const SizedBox.shrink(),
          ),

          const SizedBox(height: Spacing.xl2),

          // ── Breakdown rows ────────────────────────────────────────────────
          Text('Fund Breakdown', style: AppTypography.headingSm),
          const SizedBox(height: Spacing.md),

          GlassCard(
            child: Column(children: [
              _FundsRow('Available Cash',   fmt.format(available)),
              const Divider(color: AppColors.overlayLight, height: 1),
              _FundsRow('Invested (Margin)', fmt.format(invested),
                  color: AppColors.warning),
              const Divider(color: AppColors.overlayLight, height: 1),
              _FundsRow('Total P&L',        fmt.format(pnl),
                  color: pnl >= 0 ? AppColors.success : AppColors.danger),
              const Divider(color: AppColors.overlayLight, height: 1),
              _FundsRow('Portfolio Value',   fmt.format(total),
                  style: AppTypography.numericMd
                      .copyWith(color: AppColors.primary)),
            ]),
          ),

          const SizedBox(height: Spacing.xl2),

          GlassCard(
            child: Padding(
              padding: const EdgeInsets.all(Spacing.lg),
              child: Row(children: [
                const Icon(Icons.info_outline,
                    color: AppColors.info, size: 18),
                const SizedBox(width: Spacing.md),
                Expanded(
                  child: Text(
                    'This is a virtual trading account. No real money is involved.',
                    style: AppTypography.bodySm,
                  ),
                ),
              ]),
            ),
          ),
        ],
      ),
    );
  }

  void _showFundsDialog(BuildContext context, bool isAdd) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: Text(isAdd ? 'Add Funds' : 'Withdraw Funds'),
        content: Text(
          isAdd
              ? 'Virtual funds are for simulation only. No real money is added.'
              : 'Withdrawal is not applicable for virtual funds.',
          style: AppTypography.bodyMd,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }
}

// ── Donut chart widget ────────────────────────────────────────────────────────

class _FundsChart extends StatefulWidget {
  const _FundsChart({
    required this.available,
    required this.invested,
    required this.pnl,
    required this.total,
    required this.fmt,
  });
  final double available;
  final double invested;
  final double pnl;
  final double total;
  final NumberFormat fmt;

  @override
  State<_FundsChart> createState() => _FundsChartState();
}

class _FundsChartState extends State<_FundsChart> {
  int _touched = -1;

  @override
  Widget build(BuildContext context) {
    final safeTotal = widget.total <= 0 ? 1.0 : widget.total;
    final positivePnl = widget.pnl > 0 ? widget.pnl : 0.0;

    final sections = <_Slice>[
      _Slice('Available',  widget.available,  AppColors.primary),
      _Slice('Invested',   widget.invested,   AppColors.warning),
      if (positivePnl > 0)
        _Slice('P&L',      positivePnl,       AppColors.success),
    ].where((s) => s.value > 0).toList();

    if (sections.isEmpty) {
      return const SizedBox.shrink();
    }

    return GlassCard(
      child: Padding(
        padding: const EdgeInsets.all(Spacing.xl),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Portfolio Allocation', style: AppTypography.headingSm),
            const SizedBox(height: Spacing.xl),
            Row(
              children: [
                SizedBox(
                  width: 160,
                  height: 160,
                  child: PieChart(
                    PieChartData(
                      sectionsSpace: 2,
                      centerSpaceRadius: 44,
                      pieTouchData: PieTouchData(
                        touchCallback: (event, response) {
                          setState(() {
                            if (!event.isInterestedForInteractions ||
                                response == null ||
                                response.touchedSection == null) {
                              _touched = -1;
                            } else {
                              _touched = response
                                  .touchedSection!.touchedSectionIndex;
                            }
                          });
                        },
                      ),
                      sections: sections.asMap().entries.map((entry) {
                        final i = entry.key;
                        final s = entry.value;
                        final isTouched = i == _touched;
                        return PieChartSectionData(
                          color: s.color,
                          value: s.value / safeTotal * 100,
                          radius: isTouched ? 48 : 40,
                          title: isTouched
                              ? '${(s.value / safeTotal * 100).toStringAsFixed(1)}%'
                              : '',
                          titleStyle: AppTypography.labelSm
                              .copyWith(color: Colors.white),
                        );
                      }).toList(),
                    ),
                  ),
                ),
                const SizedBox(width: Spacing.xl2),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: sections.map((s) => Padding(
                      padding: const EdgeInsets.only(bottom: Spacing.md),
                      child: Row(children: [
                        Container(
                          width: 10, height: 10,
                          decoration: BoxDecoration(
                            color: s.color,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: Spacing.sm),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(s.label,
                                  style: AppTypography.bodySm),
                              Text(widget.fmt.format(s.value),
                                  style: AppTypography.numericSm),
                            ],
                          ),
                        ),
                      ]),
                    )).toList(),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _Slice {
  const _Slice(this.label, this.value, this.color);
  final String label;
  final double value;
  final Color color;
}

// ── Row widget ────────────────────────────────────────────────────────────────

class _FundsRow extends StatelessWidget {
  const _FundsRow(this.label, this.value, {this.color, this.style});
  final String label;
  final String value;
  final Color? color;
  final TextStyle? style;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(
        horizontal: Spacing.lg, vertical: Spacing.md),
    child: Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: AppTypography.bodyMd),
        Text(value,
            style: style ??
                AppTypography.numericMd
                    .copyWith(color: color ?? AppColors.textPrimary)),
      ],
    ),
  );
}
