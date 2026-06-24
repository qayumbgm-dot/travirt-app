import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../app/theme/colors.dart';
import '../../app/theme/typography.dart';
import '../../app/theme/spacing.dart';
import '../../app/di/injection_container.dart';
import '../../features/dashboard/domain/entities/portfolio_summary.dart';
import '../../features/dashboard/domain/usecases/get_market_indices_usecase.dart';

final _indicesProvider = FutureProvider<List<IndexQuote>>((ref) async {
  final result = await sl<GetMarketIndicesUseCase>().execute();
  return result.when(success: (i) => i, failure: (_) => []);
});

class IndicesTicker extends ConsumerWidget {
  const IndicesTicker({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(_indicesProvider);
    return async.maybeWhen(
      data: (indices) => indices.isEmpty
          ? const SizedBox.shrink()
          : SizedBox(
              height: 40,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: Spacing.xl2),
                itemCount: indices.length,
                separatorBuilder: (_, __) => const SizedBox(width: Spacing.md),
                itemBuilder: (_, i) => _IndexChip(index: indices[i]),
              ),
            ),
      orElse: () => const SizedBox.shrink(),
    );
  }
}

class _IndexChip extends StatelessWidget {
  const _IndexChip({required this.index});
  final IndexQuote index;

  @override
  Widget build(BuildContext context) {
    final color = index.isUp ? AppColors.success : AppColors.danger;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: Spacing.md, vertical: Spacing.xs),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(Radius.sm),
        border: Border.all(color: AppColors.overlayLight),
      ),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Text(index.name, style: AppTypography.labelSm),
        const SizedBox(width: Spacing.sm),
        Text(index.value.toStringAsFixed(2), style: AppTypography.numericSm),
        const SizedBox(width: Spacing.xs),
        Icon(
          index.isUp ? Icons.arrow_drop_up : Icons.arrow_drop_down,
          color: color, size: 14,
        ),
        Text(
          '${index.isUp ? '+' : ''}${index.changePct.toStringAsFixed(2)}%',
          style: AppTypography.numericSm.copyWith(color: color, fontSize: 10),
        ),
      ]),
    );
  }
}
