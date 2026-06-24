import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../../app/theme/colors.dart';
import '../../../../app/theme/typography.dart';
import '../../../../app/theme/spacing.dart';
import '../../../../shared/widgets/glass_card.dart';
import '../../../../core/notifications/notification_service.dart';

final _notificationsProvider = FutureProvider<bool>(
  (ref) => ref.read(notificationServiceProvider).isEnabled(),
);
final _liveTicksProvider = StateProvider<bool>((ref) => true);

final _packageInfoProvider = FutureProvider<PackageInfo>(
  (_) => PackageInfo.fromPlatform(),
);

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notifAsync = ref.watch(_notificationsProvider);
    final notifications = notifAsync.valueOrNull ?? false;
    final liveTicks = ref.watch(_liveTicksProvider);
    final pkgAsync      = ref.watch(_packageInfoProvider);

    return Scaffold(
      backgroundColor: AppColors.base,
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(
        padding: const EdgeInsets.all(Spacing.xl2),
        children: [
          _SectionLabel('Market Data'),
          GlassCard(
            child: Column(children: [
              _SwitchTile(
                icon: Icons.wifi_tethering,
                label: 'Live Price Feed',
                subtitle: 'WebSocket real-time prices',
                color: AppColors.success,
                value: liveTicks,
                onChanged: (v) =>
                    ref.read(_liveTicksProvider.notifier).state = v,
              ),
            ]),
          ),

          const SizedBox(height: Spacing.xl),
          _SectionLabel('Notifications'),
          GlassCard(
            child: Column(children: [
              _SwitchTile(
                icon: Icons.notifications_outlined,
                label: 'Order Alerts',
                subtitle: 'Notify when orders execute',
                color: AppColors.primary,
                value: notifications,
                onChanged: (v) async {
                  await ref.read(notificationServiceProvider).setEnabled(v);
                  ref.invalidate(_notificationsProvider);
                },
              ),
            ]),
          ),

          const SizedBox(height: Spacing.xl),
          _SectionLabel('About'),
          GlassCard(
            child: Column(children: [
              pkgAsync.when(
                data: (pkg) => Column(children: [
                  _InfoTile(label: 'Version', value: '${pkg.version} (${pkg.buildNumber})'),
                  const Divider(color: AppColors.overlayLight, height: 1),
                  _InfoTile(label: 'App Name', value: pkg.appName),
                ]),
                loading: () => const SizedBox(height: 48,
                    child: Center(child: CircularProgressIndicator())),
                error: (_, __) => const SizedBox.shrink(),
              ),
              const Divider(color: AppColors.overlayLight, height: 1),
              _InfoTile(label: 'Backend', value: _shortUrl()),
            ]),
          ),

          const SizedBox(height: Spacing.xl),
          _SectionLabel('Danger Zone'),
          GlassCard(
            borderColor: AppColors.danger.withOpacity(0.3),
            child: ListTile(
              leading: const Icon(Icons.delete_outline, color: AppColors.danger),
              title: Text('Clear Local Cache',
                  style: AppTypography.bodyLg.copyWith(color: AppColors.danger)),
              subtitle: Text('Clears watchlist & cached data',
                  style: AppTypography.bodySm),
              onTap: () => _confirmClear(context),
            ),
          ),
        ],
      ),
    );
  }

  String _shortUrl() {
    // Show only the host for privacy
    try {
      const base = String.fromEnvironment(
        'API_BASE_URL',
        defaultValue: 'travirt-backend.onrender.com',
      );
      return Uri.parse(base).host.isNotEmpty
          ? Uri.parse(base).host
          : base;
    } catch (_) {
      return 'travirt-backend.onrender.com';
    }
  }

  void _confirmClear(BuildContext context) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Clear Cache?'),
        content: const Text(
          'This will remove your watchlist and search history. Preferences and account data are kept.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(context);
              await _doClear();
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Cache cleared')),
                );
              }
            },
            child: const Text('Clear',
                style: TextStyle(color: AppColors.danger)),
          ),
        ],
      ),
    );
  }

  Future<void> _doClear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('watchlist_symbols');
    await prefs.remove('search_history');
  }
}

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.label);
  final String label;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: Spacing.md, left: Spacing.xs),
    child: Text(label,
        style: AppTypography.labelMd.copyWith(color: AppColors.muted)),
  );
}

class _SwitchTile extends StatelessWidget {
  const _SwitchTile({
    required this.icon, required this.label, required this.subtitle,
    required this.color, required this.value, required this.onChanged,
  });
  final IconData icon;
  final String label;
  final String subtitle;
  final Color color;
  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) => SwitchListTile(
    secondary: Icon(icon, color: color, size: 20),
    title: Text(label, style: AppTypography.bodyLg),
    subtitle: Text(subtitle, style: AppTypography.bodySm),
    value: value,
    activeColor: color,
    onChanged: onChanged,
  );
}

class _InfoTile extends StatelessWidget {
  const _InfoTile({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(
        horizontal: Spacing.lg, vertical: Spacing.md),
    child: Row(children: [
      Text(label, style: AppTypography.bodyMd),
      const Spacer(),
      Text(value,
          style: AppTypography.bodyMd.copyWith(color: AppColors.textSecondary)),
    ]),
  );
}
