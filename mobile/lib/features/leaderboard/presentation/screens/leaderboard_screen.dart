import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../../app/theme/colors.dart';
import '../../../../app/theme/typography.dart';
import '../../../../app/theme/spacing.dart';
import '../../../../shared/widgets/glass_card.dart';
import '../../../../shared/widgets/shimmer_box.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/constants/api_constants.dart';
import '../../../../app/di/injection_container.dart';
import '../../../auth/presentation/viewmodels/auth_viewmodel.dart';

final _leaderboardProvider = FutureProvider<List<dynamic>>((ref) async {
  final res = await sl<ApiClient>().get(ApiConstants.leaderboard);
  return res.data as List<dynamic>;
});

class LeaderboardScreen extends ConsumerWidget {
  const LeaderboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async    = ref.watch(_leaderboardProvider);
    final username = ref.watch(authViewModelProvider).user?.username;
    final fmt = NumberFormat.currency(symbol: '₹', decimalDigits: 0, locale: 'en_IN');

    return Scaffold(
      backgroundColor: AppColors.base,
      appBar: AppBar(
        title: const Text('Leaderboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.refresh(_leaderboardProvider),
          ),
        ],
      ),
      body: async.when(
        data: (entries) {
          // Find current user's rank
          final myRank = entries.indexWhere(
            (e) => (e as Map<String, dynamic>)['username'] == username,
          );

          return Column(children: [
            // My rank banner
            if (myRank >= 0)
              Container(
                margin: const EdgeInsets.fromLTRB(
                    Spacing.xl2, Spacing.lg, Spacing.xl2, 0),
                padding: const EdgeInsets.symmetric(
                    horizontal: Spacing.lg, vertical: Spacing.md),
                decoration: BoxDecoration(
                  color: AppColors.primaryMuted,
                  borderRadius: BorderRadius.circular(Radius.md),
                  border: Border.all(color: AppColors.primary.withOpacity(0.4)),
                ),
                child: Row(children: [
                  const Icon(Icons.person, color: AppColors.primary, size: 16),
                  const SizedBox(width: Spacing.sm),
                  Text('Your rank: #${myRank + 1}',
                      style: AppTypography.labelMd
                          .copyWith(color: AppColors.primary)),
                  const Spacer(),
                  Text(
                    fmt.format(
                      (entries[myRank] as Map<String, dynamic>)['totalPnl'] ?? 0,
                    ),
                    style: AppTypography.numericSm.copyWith(
                      color: ((entries[myRank] as Map)['totalPnl'] as num? ?? 0) >= 0
                          ? AppColors.success
                          : AppColors.danger,
                    ),
                  ),
                ]),
              ),

            // Full list
            Expanded(
              child: ListView.separated(
                padding: const EdgeInsets.all(Spacing.xl2),
                itemCount: entries.length,
                separatorBuilder: (_, __) => const SizedBox(height: Spacing.md),
                itemBuilder: (_, i) {
                  final e = entries[i] as Map<String, dynamic>;
                  final rank = i + 1;
                  final pnl = (e['totalPnl'] as num?)?.toDouble() ?? 0;
                  final winRate = (e['winRate'] as num?)?.toDouble() ?? 0;
                  final isTop  = rank <= 3;
                  final isMe   = e['username'] == username;

                  return GlassCard(
                    borderColor: isMe
                        ? AppColors.primary.withOpacity(0.5)
                        : isTop
                            ? _rankColor(rank).withOpacity(0.4)
                            : null,
                    gradient: isMe
                        ? LinearGradient(colors: [
                            AppColors.primary.withOpacity(0.08),
                            Colors.transparent,
                          ])
                        : null,
                    child: Padding(
                      padding: const EdgeInsets.all(Spacing.lg),
                      child: Row(children: [
                        SizedBox(
                          width: 36,
                          child: isTop
                              ? Icon(Icons.emoji_events,
                                  color: _rankColor(rank), size: 28)
                              : Text('#$rank',
                                  style: AppTypography.numericMd
                                      .copyWith(color: AppColors.muted),
                                  textAlign: TextAlign.center),
                        ),
                        const SizedBox(width: Spacing.md),
                        CircleAvatar(
                          radius: 20,
                          backgroundColor: isMe
                              ? AppColors.primaryMuted
                              : AppColors.surface,
                          child: Text(
                            (e['username'] as String? ?? 'U')[0].toUpperCase(),
                            style: AppTypography.headingSm.copyWith(
                              color: isMe ? AppColors.primary : AppColors.textSecondary,
                            ),
                          ),
                        ),
                        const SizedBox(width: Spacing.md),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(children: [
                                Text(e['username'] as String? ?? 'Unknown',
                                    style: AppTypography.headingSm),
                                if (isMe) ...[
                                  const SizedBox(width: Spacing.xs),
                                  Text('(you)',
                                      style: AppTypography.bodySm.copyWith(
                                          color: AppColors.primary)),
                                ],
                              ]),
                              Text('Win rate: ${winRate.toStringAsFixed(1)}%',
                                  style: AppTypography.bodySm),
                            ],
                          ),
                        ),
                        Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                          Text(fmt.format(pnl),
                              style: AppTypography.numericMd.copyWith(
                                color: pnl >= 0 ? AppColors.success : AppColors.danger,
                              )),
                          Text('P&L', style: AppTypography.bodySm),
                        ]),
                      ]),
                    ),
                  );
                },
              ),
            ),
          ]);
        },
        loading: () => const ShimmerList(count: 10),
        error: (e, _) => Center(
            child: Text(e.toString(), style: AppTypography.bodyMd)),
      ),
    );
  }

  Color _rankColor(int rank) => switch (rank) {
    1 => const Color(0xFFFFD700),
    2 => const Color(0xFFC0C0C0),
    3 => const Color(0xFFCD7F32),
    _ => AppColors.muted,
  };
}
