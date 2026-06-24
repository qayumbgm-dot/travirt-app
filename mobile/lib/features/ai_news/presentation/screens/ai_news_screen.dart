import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../app/theme/colors.dart';
import '../../../../app/theme/typography.dart';
import '../../../../app/theme/spacing.dart';
import '../../../../shared/widgets/glass_card.dart';
import '../../../../shared/widgets/shimmer_box.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/constants/api_constants.dart';
import '../../../../app/di/injection_container.dart';

final _newsProvider = FutureProvider<List<dynamic>>((ref) async {
  final res = await sl<ApiClient>().get(ApiConstants.aiNews);
  return res.data as List<dynamic>;
});

// 'all' | 'positive' | 'negative' | 'neutral'
final _sentimentFilterProvider = StateProvider<String>((ref) => 'all');

class AiNewsScreen extends ConsumerWidget {
  const AiNewsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async  = ref.watch(_newsProvider);
    final filter = ref.watch(_sentimentFilterProvider);

    return Scaffold(
      backgroundColor: AppColors.base,
      appBar: AppBar(
        title: const Text('AI Market News'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.refresh(_newsProvider),
          ),
        ],
      ),
      body: Column(
        children: [
          // ── Sentiment filter chips ─────────────────────────────────────────
          _SentimentBar(
            selected: filter,
            onSelect: (v) => ref.read(_sentimentFilterProvider.notifier).state = v,
          ),

          // ── News list ──────────────────────────────────────────────────────
          Expanded(
            child: async.when(
              data: (items) {
                final filtered = filter == 'all'
                    ? items
                    : items.where((item) {
                        final s = (item as Map<String, dynamic>)['sentiment']
                            as String? ?? 'neutral';
                        return s.toLowerCase() == filter;
                      }).toList();

                if (filtered.isEmpty) {
                  return Center(
                    child: Text('No $filter news right now',
                        style: AppTypography.bodyMd),
                  );
                }

                return ListView.separated(
                  padding: const EdgeInsets.all(Spacing.xl2),
                  itemCount: filtered.length,
                  separatorBuilder: (_, __) =>
                      const SizedBox(height: Spacing.md),
                  itemBuilder: (_, i) {
                    final item = filtered[i] as Map<String, dynamic>;
                    final sentiment =
                        item['sentiment'] as String? ?? 'neutral';
                    final sentimentColor = switch (sentiment.toLowerCase()) {
                      'positive' => AppColors.success,
                      'negative' => AppColors.danger,
                      _          => AppColors.warning,
                    };

                    return GlassCard(
                      onTap: () async {
                        final url = item['url'] as String?;
                        if (url != null) {
                          await launchUrl(Uri.parse(url),
                              mode: LaunchMode.externalApplication);
                        }
                      },
                      child: Padding(
                        padding: const EdgeInsets.all(Spacing.lg),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment:
                                  MainAxisAlignment.spaceBetween,
                              children: [
                                Flexible(
                                  child: Text(
                                      item['source'] as String? ?? '',
                                      style: AppTypography.bodySm),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: Spacing.sm, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: sentimentColor.withOpacity(0.15),
                                    borderRadius:
                                        BorderRadius.circular(Radius.xs),
                                  ),
                                  child: Text(
                                    sentiment.toUpperCase(),
                                    style: AppTypography.labelSm
                                        .copyWith(color: sentimentColor),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: Spacing.sm),
                            Text(item['title'] as String? ?? '',
                                style: AppTypography.headingSm),
                            if (item['summary'] != null) ...[
                              const SizedBox(height: Spacing.sm),
                              Text(item['summary'] as String,
                                  style: AppTypography.bodyMd,
                                  maxLines: 3,
                                  overflow: TextOverflow.ellipsis),
                            ],
                          ],
                        ),
                      ),
                    );
                  },
                );
              },
              loading: () => const ShimmerList(count: 8, cardHeight: 110),
              error: (e, _) => Center(
                  child: Text(e.toString(), style: AppTypography.bodyMd)),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Sentiment filter bar ──────────────────────────────────────────────────────

class _SentimentBar extends StatelessWidget {
  const _SentimentBar({required this.selected, required this.onSelect});
  final String selected;
  final void Function(String) onSelect;

  static const _options = [
    (value: 'all',      label: 'All',      color: AppColors.primary),
    (value: 'positive', label: 'Bullish',  color: AppColors.success),
    (value: 'negative', label: 'Bearish',  color: AppColors.danger),
    (value: 'neutral',  label: 'Neutral',  color: AppColors.warning),
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.base,
      padding: const EdgeInsets.fromLTRB(
          Spacing.xl2, Spacing.sm, Spacing.xl2, Spacing.md),
      child: Row(
        children: _options.map((opt) {
          final isSelected = selected == opt.value;
          return Padding(
            padding: const EdgeInsets.only(right: Spacing.sm),
            child: GestureDetector(
              onTap: () => onSelect(opt.value),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.symmetric(
                    horizontal: Spacing.md, vertical: Spacing.xs),
                decoration: BoxDecoration(
                  color: isSelected
                      ? opt.color.withOpacity(0.2)
                      : AppColors.surface,
                  borderRadius:
                      BorderRadius.circular(Radius.full),
                  border: Border.all(
                    color: isSelected
                        ? opt.color.withOpacity(0.6)
                        : AppColors.overlayLight,
                  ),
                ),
                child: Text(
                  opt.label,
                  style: AppTypography.labelSm.copyWith(
                    color: isSelected ? opt.color : AppColors.muted,
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}
