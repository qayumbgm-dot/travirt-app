import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../app/navigation/app_router.dart';
import '../../../../app/theme/colors.dart';
import '../../../../app/theme/typography.dart';
import '../../../../app/theme/spacing.dart';
import '../../../../shared/widgets/glass_card.dart';
import '../../../auth/presentation/viewmodels/auth_viewmodel.dart';

class MoreScreen extends ConsumerWidget {
  const MoreScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authViewModelProvider).user;

    return Scaffold(
      backgroundColor: AppColors.base,
      appBar: AppBar(title: const Text('More')),
      body: ListView(
        padding: const EdgeInsets.all(Spacing.xl2),
        children: [
          // Profile card
          GlassCard(
            onTap: () => context.go(AppRoutes.profile),
            gradient: LinearGradient(
              colors: [AppColors.primary.withOpacity(0.12), Colors.transparent],
            ),
            child: Padding(
              padding: const EdgeInsets.all(Spacing.xl),
              child: Row(children: [
                CircleAvatar(
                  radius: 28,
                  backgroundColor: AppColors.primaryMuted,
                  child: Text(
                    (user?.username ?? 'T')[0].toUpperCase(),
                    style: AppTypography.headingLg.copyWith(color: AppColors.primary),
                  ),
                ),
                const SizedBox(width: Spacing.lg),
                Expanded(child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(user?.username ?? '—', style: AppTypography.headingMd),
                    Text(user?.email ?? '', style: AppTypography.bodySm),
                    const SizedBox(height: Spacing.xs),
                    _PlanBadge(plan: user?.plan ?? 'free'),
                  ],
                )),
                const Icon(Icons.chevron_right, color: AppColors.muted),
              ]),
            ),
          ),
          const SizedBox(height: Spacing.xl2),

          _SectionLabel('Trading'),
          _MenuItem(
            icon: Icons.bookmark_border,
            label: 'Watchlist',
            subtitle: 'Your saved symbols',
            color: AppColors.primary,
            onTap: () => context.go(AppRoutes.watchlist),
          ),
          _MenuItem(
            icon: Icons.leaderboard,
            label: 'Leaderboard',
            subtitle: 'See how you rank',
            color: AppColors.info,
            onTap: () => context.go(AppRoutes.leaderboard),
          ),
          _MenuItem(
            icon: Icons.add_alert_outlined,
            label: 'Price Alerts',
            subtitle: 'Get notified at your target price',
            color: AppColors.warning,
            onTap: () => context.go(AppRoutes.alerts),
          ),
          _MenuItem(
            icon: Icons.auto_awesome,
            label: 'AI News',
            subtitle: 'Sentiment-tagged market news',
            color: AppColors.warning,
            onTap: () => context.go(AppRoutes.aiNews),
          ),
          _MenuItem(
            icon: Icons.chat_outlined,
            label: 'AI Chat',
            subtitle: 'Ask about markets & strategies',
            color: AppColors.primary,
            onTap: () => context.go(AppRoutes.aiChat),
          ),
          _MenuItem(
            icon: Icons.account_balance_wallet_outlined,
            label: 'Funds',
            subtitle: 'Virtual balance & breakdown',
            color: AppColors.success,
            onTap: () => context.go(AppRoutes.funds),
          ),
          _MenuItem(
            icon: Icons.bar_chart,
            label: 'Trade Statistics',
            subtitle: 'Win rate, streaks, best trades',
            color: AppColors.info,
            onTap: () => context.go(AppRoutes.tradeStats),
          ),

          const SizedBox(height: Spacing.xl),
          const SizedBox(height: Spacing.xl),
          _SectionLabel('App'),
          _MenuItem(
            icon: Icons.settings_outlined,
            label: 'Settings',
            subtitle: 'Live feed, notifications, app info',
            color: AppColors.muted,
            onTap: () => context.go(AppRoutes.settings),
          ),

          const SizedBox(height: Spacing.xl),
          _SectionLabel('Account'),
          _MenuItem(
            icon: Icons.workspace_premium_outlined,
            label: 'Subscription',
            subtitle: 'Upgrade your plan',
            color: const Color(0xFFFFD700),
            onTap: () => context.go(AppRoutes.billing),
          ),
          _MenuItem(
            icon: Icons.store_outlined,
            label: 'Brokerage',
            subtitle: 'Open real account & calculator',
            color: AppColors.primary,
            onTap: () => context.go(AppRoutes.brokerage),
          ),
          _MenuItem(
            icon: Icons.person_outline,
            label: 'Profile & Settings',
            subtitle: 'Edit account settings',
            color: AppColors.muted,
            onTap: () => context.go(AppRoutes.profile),
          ),
        ],
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.label);
  final String label;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: Spacing.md),
    child: Text(label, style: AppTypography.labelMd.copyWith(color: AppColors.muted)),
  );
}

class _MenuItem extends StatelessWidget {
  const _MenuItem({
    required this.icon,
    required this.label,
    required this.subtitle,
    required this.color,
    required this.onTap,
  });
  final IconData icon;
  final String label;
  final String subtitle;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: Spacing.md),
    child: GlassCard(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(
            horizontal: Spacing.lg, vertical: Spacing.md),
        child: Row(children: [
          Container(
            width: 40, height: 40,
            decoration: BoxDecoration(
              color: color.withOpacity(0.12),
              borderRadius: BorderRadius.circular(Radius.sm),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: Spacing.md),
          Expanded(child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: AppTypography.headingSm),
              Text(subtitle, style: AppTypography.bodySm),
            ],
          )),
          const Icon(Icons.chevron_right, color: AppColors.muted, size: 18),
        ]),
      ),
    ),
  );
}

class _PlanBadge extends StatelessWidget {
  const _PlanBadge({required this.plan});
  final String plan;

  Color get _color => switch (plan) {
    'elite' => const Color(0xFFFFD700),
    'pro'   => AppColors.primary,
    _       => AppColors.muted,
  };

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: Spacing.sm, vertical: 2),
    decoration: BoxDecoration(
      color: _color.withOpacity(0.15),
      borderRadius: BorderRadius.circular(Radius.xs),
    ),
    child: Text(
      plan.toUpperCase(),
      style: AppTypography.labelSm.copyWith(color: _color),
    ),
  );
}
