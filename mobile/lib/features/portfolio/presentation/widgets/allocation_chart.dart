import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import '../../../../app/theme/colors.dart';
import '../../../../app/theme/typography.dart';
import '../../../../app/theme/spacing.dart';
import '../../../../shared/widgets/glass_card.dart';
import '../../domain/entities/holding.dart';

// Palette cycles for pie slices
const _palette = [
  Color(0xFF007BFF), Color(0xFF00C853), Color(0xFFFF9800),
  Color(0xFFE91E63), Color(0xFF9C27B0), Color(0xFF00BCD4),
  Color(0xFFFF5722), Color(0xFF8BC34A),
];

class AllocationChart extends StatefulWidget {
  const AllocationChart({super.key, required this.holdings});
  final List<Holding> holdings;

  @override
  State<AllocationChart> createState() => _AllocationChartState();
}

class _AllocationChartState extends State<AllocationChart> {
  int _touched = -1;

  @override
  Widget build(BuildContext context) {
    if (widget.holdings.isEmpty) return const SizedBox.shrink();

    final total = widget.holdings
        .fold<double>(0, (sum, h) => sum + h.currentValue);

    // Take top 7, bundle rest as "Others"
    final sorted = [...widget.holdings]
      ..sort((a, b) => b.currentValue.compareTo(a.currentValue));
    final top    = sorted.take(7).toList();
    final others = sorted.skip(7).fold<double>(0, (s, h) => s + h.currentValue);

    final sections = <PieChartSectionData>[];
    for (var i = 0; i < top.length; i++) {
      final pct = top[i].currentValue / total * 100;
      final isTouched = i == _touched;
      sections.add(PieChartSectionData(
        color: _palette[i % _palette.length],
        value: top[i].currentValue,
        title: isTouched ? '${pct.toStringAsFixed(1)}%' : '',
        radius: isTouched ? 56 : 48,
        titleStyle: AppTypography.labelSm.copyWith(color: Colors.white),
      ));
    }
    if (others > 0) {
      sections.add(PieChartSectionData(
        color: AppColors.muted,
        value: others,
        title: '',
        radius: _touched == top.length ? 56 : 48,
      ));
    }

    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text('Allocation', style: AppTypography.headingSm),
      const SizedBox(height: Spacing.md),
      GlassCard(
        child: Padding(
          padding: const EdgeInsets.all(Spacing.xl),
          child: Row(children: [
            // Pie
            SizedBox(
              width: 140, height: 140,
              child: PieChart(
                PieChartData(
                  sections: sections,
                  centerSpaceRadius: 36,
                  sectionsSpace: 2,
                  pieTouchData: PieTouchData(
                    touchCallback: (_, resp) => setState(() {
                      _touched = resp?.touchedSection?.touchedSectionIndex ?? -1;
                    }),
                  ),
                ),
              ),
            ),
            const SizedBox(width: Spacing.xl),
            // Legend
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  for (var i = 0; i < top.length; i++)
                    _LegendItem(
                      color: _palette[i % _palette.length],
                      symbol: top[i].symbol,
                      pct: top[i].currentValue / total * 100,
                    ),
                  if (others > 0)
                    _LegendItem(
                      color: AppColors.muted,
                      symbol: 'Others',
                      pct: others / total * 100,
                    ),
                ],
              ),
            ),
          ]),
        ),
      ),
    ]);
  }
}

class _LegendItem extends StatelessWidget {
  const _LegendItem({required this.color, required this.symbol, required this.pct});
  final Color color;
  final String symbol;
  final double pct;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: Spacing.sm),
    child: Row(children: [
      Container(
        width: 8, height: 8,
        decoration: BoxDecoration(color: color, shape: BoxShape.circle),
      ),
      const SizedBox(width: Spacing.sm),
      Expanded(
        child: Text(symbol, style: AppTypography.bodySm,
            overflow: TextOverflow.ellipsis),
      ),
      Text('${pct.toStringAsFixed(1)}%',
          style: AppTypography.numericSm),
    ]),
  );
}
