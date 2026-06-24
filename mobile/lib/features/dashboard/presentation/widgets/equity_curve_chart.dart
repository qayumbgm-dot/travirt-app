import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../app/theme/colors.dart';
import '../../../../app/theme/typography.dart';
import '../../../../app/theme/spacing.dart';
import '../../../../shared/widgets/glass_card.dart';
import '../../../../app/di/injection_container.dart';
import '../../domain/repositories/dashboard_repository.dart';

final _equityCurveProvider =
    FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final result = await sl<DashboardRepository>().getEquityCurve();
  return result.when(success: (d) => d, failure: (_) => []);
});

class EquityCurveChart extends ConsumerWidget {
  const EquityCurveChart({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(_equityCurveProvider);

    return async.when(
      loading: () => _placeholder(),
      error: (_, __) => const SizedBox.shrink(),
      data: (points) {
        if (points.isEmpty) return const SizedBox.shrink();
        return _Chart(points: points);
      },
    );
  }

  Widget _placeholder() => Container(
    height: 160,
    decoration: BoxDecoration(
      color: AppColors.surface,
      borderRadius: BorderRadius.circular(Radius.lg),
    ),
  );
}

class _Chart extends StatelessWidget {
  const _Chart({required this.points});
  final List<Map<String, dynamic>> points;

  @override
  Widget build(BuildContext context) {
    final spots = points.asMap().entries.map((e) {
      final value = (e.value['portfolioValue'] as num?)?.toDouble() ?? 0;
      return FlSpot(e.key.toDouble(), value);
    }).toList();

    final values = spots.map((s) => s.y).toList();
    final minY = values.reduce((a, b) => a < b ? a : b);
    final maxY = values.reduce((a, b) => a > b ? a : b);
    final isProfit = spots.last.y >= spots.first.y;
    final lineColor = isProfit ? AppColors.success : AppColors.danger;
    final padding = (maxY - minY) * 0.1;

    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text('Equity Curve', style: AppTypography.headingSm),
      const SizedBox(height: Spacing.md),
      GlassCard(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(
              Spacing.sm, Spacing.xl, Spacing.xl, Spacing.md),
          child: SizedBox(
            height: 160,
            child: LineChart(
              LineChartData(
                minY: minY - padding,
                maxY: maxY + padding,
                clipData: const FlClipData.all(),
                gridData: FlGridData(
                  show: true,
                  drawVerticalLine: false,
                  horizontalInterval: (maxY - minY) / 4,
                  getDrawingHorizontalLine: (_) => FlLine(
                    color: AppColors.overlayLight,
                    strokeWidth: 0.5,
                  ),
                ),
                borderData: FlBorderData(show: false),
                titlesData: FlTitlesData(
                  leftTitles: const AxisTitles(
                    sideTitles: SideTitles(showTitles: false),
                  ),
                  rightTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      reservedSize: 56,
                      getTitlesWidget: (val, _) => Text(
                        '₹${_compact(val)}',
                        style: AppTypography.bodySm,
                      ),
                    ),
                  ),
                  topTitles: const AxisTitles(
                    sideTitles: SideTitles(showTitles: false),
                  ),
                  bottomTitles: const AxisTitles(
                    sideTitles: SideTitles(showTitles: false),
                  ),
                ),
                lineBarsData: [
                  LineChartBarData(
                    spots: spots,
                    isCurved: true,
                    curveSmoothness: 0.35,
                    color: lineColor,
                    barWidth: 2,
                    dotData: const FlDotData(show: false),
                    belowBarData: BarAreaData(
                      show: true,
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          lineColor.withOpacity(0.25),
                          lineColor.withOpacity(0.0),
                        ],
                      ),
                    ),
                  ),
                ],
                lineTouchData: LineTouchData(
                  touchTooltipData: LineTouchTooltipData(
                    getTooltipColor: (_) => AppColors.overlay,
                    getTooltipItems: (spots) => spots.map((s) =>
                      LineTooltipItem(
                        '₹${s.y.toStringAsFixed(0)}',
                        AppTypography.numericSm.copyWith(color: lineColor),
                      ),
                    ).toList(),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    ]);
  }

  String _compact(double v) {
    if (v >= 10000000) return '${(v / 10000000).toStringAsFixed(1)}Cr';
    if (v >= 100000)   return '${(v / 100000).toStringAsFixed(1)}L';
    if (v >= 1000)     return '${(v / 1000).toStringAsFixed(1)}K';
    return v.toStringAsFixed(0);
  }
}
