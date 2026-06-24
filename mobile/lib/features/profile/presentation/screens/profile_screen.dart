import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../app/navigation/app_router.dart';
import '../../../../app/theme/colors.dart';
import '../../../../app/theme/typography.dart';
import '../../../../app/theme/spacing.dart';
import '../../../../shared/widgets/glass_card.dart';
import '../../../../shared/widgets/travirt_button.dart';
import '../../../auth/presentation/viewmodels/auth_viewmodel.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authViewModelProvider).user;

    return Scaffold(
      backgroundColor: AppColors.base,
      appBar: AppBar(
        title: const Text('Profile'),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit_outlined),
            tooltip: 'Edit Profile',
            onPressed: () => context.go(AppRoutes.editProfile),
          ),
        ],
      ),
      body: user == null
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(Spacing.xl2),
              children: [
                // Avatar
                Center(
                  child: Column(children: [
                    CircleAvatar(
                      radius: 40,
                      backgroundColor: AppColors.primaryMuted,
                      child: Text(
                        user.username[0].toUpperCase(),
                        style: AppTypography.displayMd
                            .copyWith(color: AppColors.primary),
                      ),
                    ),
                    const SizedBox(height: Spacing.md),
                    Text(user.username, style: AppTypography.headingLg),
                    Text(user.email, style: AppTypography.bodyMd),
                    const SizedBox(height: Spacing.sm),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: Spacing.md, vertical: Spacing.xs),
                      decoration: BoxDecoration(
                        color: AppColors.primaryMuted,
                        borderRadius: BorderRadius.circular(Radius.full),
                      ),
                      child: Text(
                        user.plan.toUpperCase(),
                        style: AppTypography.labelSm
                            .copyWith(color: AppColors.primary),
                      ),
                    ),
                  ]),
                ),

                const SizedBox(height: Spacing.xl3),

                _Section(title: 'Account', items: [
                  _Item(icon: Icons.card_membership_outlined,
                      label: 'Subscription', onTap: () => context.go(AppRoutes.billing)),
                  _Item(icon: Icons.account_balance_wallet_outlined,
                      label: 'Funds', onTap: () => context.go(AppRoutes.funds)),
                  _Item(icon: Icons.handshake_outlined,
                      label: 'Brokerage', onTap: () => context.go(AppRoutes.brokerage)),
                ]),

                const SizedBox(height: Spacing.xl),

                _Section(title: 'Preferences', items: [
                  _Item(icon: Icons.settings_outlined,
                      label: 'Settings', onTap: () => context.go(AppRoutes.settings)),
                  _Item(icon: Icons.lock_outline,
                      label: 'Change Password',
                      onTap: () => context.go(AppRoutes.changePassword)),
                  _Item(icon: Icons.security_outlined,
                      label: 'Security & 2FA',
                      onTap: () => context.go(AppRoutes.security)),
                ]),

                const SizedBox(height: Spacing.xl),

                _Section(title: 'Support', items: [
                  _Item(icon: Icons.help_outline,
                      label: 'Help & FAQ',
                      onTap: () => context.go(AppRoutes.help)),
                  _Item(icon: Icons.privacy_tip_outlined,
                      label: 'Privacy Policy',
                      onTap: () => _launchPrivacyPolicy(context)),
                ]),

                const SizedBox(height: Spacing.xl2),

                TravirtButton(
                  label: 'Sign Out',
                  variant: ButtonVariant.outline,
                  icon: Icons.logout,
                  onPressed: () async {
                    await ref.read(authViewModelProvider.notifier).logout();
                    if (context.mounted) context.go(AppRoutes.login);
                  },
                ),

                const SizedBox(height: Spacing.xl4),
              ],
            ),
    );
  }
}

Future<void> _launchPrivacyPolicy(BuildContext context) async {
  final uri = Uri.parse('https://travirt.in/privacy');
  if (await canLaunchUrl(uri)) {
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }
}

class _Section extends StatelessWidget {
  const _Section({required this.title, required this.items});
  final String title;
  final List<_Item> items;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Padding(
        padding: const EdgeInsets.only(bottom: Spacing.sm, left: Spacing.xs),
        child: Text(title, style: AppTypography.labelMd),
      ),
      GlassCard(
        child: Column(
          children: items.asMap().entries.map((entry) {
            final isLast = entry.key == items.length - 1;
            return Column(children: [
              entry.value,
              if (!isLast) const Divider(color: AppColors.overlayLight, height: 1),
            ]);
          }).toList(),
        ),
      ),
    ],
  );
}

class _Item extends StatelessWidget {
  const _Item({required this.icon, required this.label, required this.onTap});
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => ListTile(
    leading: Icon(icon, color: AppColors.textSecondary, size: 20),
    title: Text(label, style: AppTypography.bodyLg),
    trailing: const Icon(Icons.chevron_right, color: AppColors.muted, size: 20),
    onTap: onTap,
  );
}
