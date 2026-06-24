import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../../app/theme/colors.dart';
import '../../../../app/theme/typography.dart';
import '../../../../app/theme/spacing.dart';
import '../../../../shared/widgets/glass_card.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/constants/api_constants.dart';
import '../../../../app/di/injection_container.dart';
import '../../../../shared/widgets/shimmer_box.dart';

final _calendarProvider =
    FutureProvider<Map<String, double>>((ref) async {
  final res = await sl<ApiClient>().get(ApiConstants.pnlCalendar);
  final raw = res.data as Map<String, dynamic>;
  return raw.map((k, v) => MapEntry(k, (v as num).toDouble()));
});

class PnlCalendarScreen extends ConsumerStatefulWidget {
  const PnlCalendarScreen({super.key});

  @override
  ConsumerState<PnlCalendarScreen> createState() => _PnlCalendarScreenState();
}

class _PnlCalendarScreenState extends ConsumerState<PnlCalendarScreen> {
  DateTime _month = DateTime(DateTime.now().year, DateTime.now().month);

  void _prevMonth() => setState(() {
    _month = DateTime(_month.year, _month.month - 1);
  });

  void _nextMonth() {
    final now = DateTime.now();
    if (_month.year == now.year && _month.month == now.month) return;
    setState(() => _month = DateTime(_month.year, _month.month + 1));
  }

  @override
  Widget build(BuildContext context, ) {
    final calAsync = ref.watch(_calendarProvider);

    return Scaffold(
      backgroundColor: AppColors.base,
      appBar: AppBar(title: const Text('P&L Calendar')),
      body: calAsync.when(
        loading: () => ListView(
          padding: const EdgeInsets.all(Spacing.xl2),
          children: [
            const ShimmerBox(height: 36),
            const SizedBox(height: Spacing.lg),
            const ShimmerBox(height: 72),
            const SizedBox(height: Spacing.xl2),
            const ShimmerBox(height: 320),
          ],
        ),
        error: (e, _) => Center(
            child: Text(e.toString(), style: AppTypography.bodyMd)),
        data: (data) => _CalendarView(
          month: _month,
          data: data,
          onPrev: _prevMonth,
          onNext: _nextMonth,
        ),
      ),
    );
  }
}

class _CalendarView extends StatelessWidget {
  const _CalendarView({
    required this.month,
    required this.data,
    required this.onPrev,
    required this.onNext,
  });

  final DateTime month;
  final Map<String, double> data;
  final VoidCallback onPrev;
  final VoidCallback onNext;

  @override
  Widget build(BuildContext context) {
    final fmt        = DateFormat('MMMM yyyy');
    final dayFmt     = DateFormat('yyyy-MM-dd');
    final currFmt    = NumberFormat.compact(locale: 'en_IN');
    final now        = DateTime.now();
    final isCurrentMonth =
        month.year == now.year && month.month == now.month;

    // Build calendar grid
    final firstDay  = DateTime(month.year, month.month, 1);
    final lastDay   = DateTime(month.year, month.month + 1, 0);
    final startPad  = firstDay.weekday % 7; // 0=Sun
    final totalCells = startPad + lastDay.day;
    final rows      = (totalCells / 7).ceil();

    // Monthly summary
    double monthTotal = 0;
    int profitDays = 0, lossDays = 0;
    for (var d = 1; d <= lastDay.day; d++) {
      final key = dayFmt.format(DateTime(month.year, month.month, d));
      final val = data[key];
      if (val != null) {
        monthTotal += val;
        if (val > 0) profitDays++;
        if (val < 0) lossDays++;
      }
    }

    return ListView(
      padding: const EdgeInsets.all(Spacing.xl2),
      children: [
        // Month navigation
        Row(children: [
          IconButton(
            icon: const Icon(Icons.chevron_left),
            onPressed: onPrev,
          ),
          Expanded(
            child: Text(fmt.format(month),
                style: AppTypography.headingMd,
                textAlign: TextAlign.center),
          ),
          IconButton(
            icon: Icon(Icons.chevron_right,
                color: isCurrentMonth ? AppColors.muted : null),
            onPressed: isCurrentMonth ? null : onNext,
          ),
        ]),

        const SizedBox(height: Spacing.lg),

        // Monthly summary row
        GlassCard(
          gradient: LinearGradient(
            colors: [
              (monthTotal >= 0 ? AppColors.success : AppColors.danger)
                  .withOpacity(0.1),
              Colors.transparent,
            ],
          ),
          child: Padding(
            padding: const EdgeInsets.all(Spacing.lg),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _SummaryItem(
                  label: 'Month P&L',
                  value: '${monthTotal >= 0 ? '+' : ''}₹${currFmt.format(monthTotal)}',
                  color: monthTotal >= 0 ? AppColors.success : AppColors.danger,
                ),
                _SummaryItem(
                  label: 'Profit Days',
                  value: '$profitDays',
                  color: AppColors.success,
                ),
                _SummaryItem(
                  label: 'Loss Days',
                  value: '$lossDays',
                  color: AppColors.danger,
                ),
              ],
            ),
          ),
        ),

        const SizedBox(height: Spacing.xl2),

        // Day-of-week headers
        GlassCard(
          child: Padding(
            padding: const EdgeInsets.all(Spacing.md),
            child: Column(children: [
              Row(
                children: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                    .map((d) => Expanded(
                      child: Text(d,
                          style: AppTypography.labelSm
                              .copyWith(color: AppColors.muted),
                          textAlign: TextAlign.center),
                    ))
                    .toList(),
              ),
              const SizedBox(height: Spacing.sm),

              // Calendar grid
              for (int row = 0; row < rows; row++)
                Padding(
                  padding: const EdgeInsets.only(bottom: Spacing.xs),
                  child: Row(
                    children: List.generate(7, (col) {
                      final cellIdx = row * 7 + col;
                      final dayNum  = cellIdx - startPad + 1;

                      if (dayNum < 1 || dayNum > lastDay.day) {
                        return const Expanded(child: SizedBox(height: 48));
                      }

                      final date  = DateTime(month.year, month.month, dayNum);
                      final key   = dayFmt.format(date);
                      final pnl   = data[key];
                      final isFuture = date.isAfter(now);

                      return Expanded(
                        child: _DayCell(
                          day: dayNum,
                          pnl: pnl,
                          isFuture: isFuture,
                          isToday: date.year == now.year &&
                              date.month == now.month &&
                              date.day == now.day,
                        ),
                      );
                    }),
                  ),
                ),
            ]),
          ),
        ),

        const SizedBox(height: Spacing.xl),

        // Legend
        Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          _LegendDot(color: AppColors.success, label: 'Profit'),
          const SizedBox(width: Spacing.xl),
          _LegendDot(color: AppColors.danger, label: 'Loss'),
          const SizedBox(width: Spacing.xl),
          _LegendDot(color: AppColors.surface, label: 'No trade'),
        ]),
      ],
    );
  }
}

class _DayCell extends StatelessWidget {
  const _DayCell({
    required this.day,
    required this.pnl,
    required this.isFuture,
    required this.isToday,
  });
  final int day;
  final double? pnl;
  final bool isFuture;
  final bool isToday;

  @override
  Widget build(BuildContext context) {
    final hasData = pnl != null && !isFuture;
    final color   = hasData
        ? (pnl! >= 0 ? AppColors.success : AppColors.danger)
        : null;
    final fmt = NumberFormat.compact(locale: 'en_IN');

    return Container(
      height: 52,
      margin: const EdgeInsets.all(2),
      decoration: BoxDecoration(
        color: hasData
            ? color!.withOpacity(0.15)
            : AppColors.overlay.withOpacity(0.3),
        borderRadius: BorderRadius.circular(Radius.sm),
        border: isToday
            ? Border.all(color: AppColors.primary, width: 1.5)
            : hasData
                ? Border.all(color: color!.withOpacity(0.3))
                : null,
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            '$day',
            style: AppTypography.labelSm.copyWith(
              color: isToday
                  ? AppColors.primary
                  : isFuture
                      ? AppColors.muted.withOpacity(0.4)
                      : AppColors.textSecondary,
            ),
          ),
          if (hasData) ...[
            const SizedBox(height: 1),
            Text(
              '${pnl! >= 0 ? '+' : ''}${fmt.format(pnl)}',
              style: TextStyle(
                fontSize: 8,
                fontFamily: 'Exo2',
                color: color,
                fontWeight: FontWeight.w600,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ],
      ),
    );
  }
}

class _SummaryItem extends StatelessWidget {
  const _SummaryItem({required this.label, required this.value, required this.color});
  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) => Column(children: [
    Text(value, style: AppTypography.numericMd.copyWith(color: color)),
    Text(label, style: AppTypography.labelSm),
  ]);
}

class _LegendDot extends StatelessWidget {
  const _LegendDot({required this.color, required this.label});
  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) => Row(children: [
    Container(
      width: 10, height: 10,
      decoration: BoxDecoration(color: color, shape: BoxShape.circle),
    ),
    const SizedBox(width: Spacing.xs),
    Text(label, style: AppTypography.bodySm),
  ]);
}
