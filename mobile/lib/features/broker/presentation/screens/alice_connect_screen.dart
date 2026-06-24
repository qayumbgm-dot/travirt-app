import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../app/theme/colors.dart';
import '../../../../app/theme/typography.dart';
import '../../../../app/theme/spacing.dart';
import '../../../../shared/widgets/glass_card.dart';
import '../../../../shared/widgets/travirt_button.dart';
import '../../../../core/network/api_client.dart';
import '../../../../app/di/injection_container.dart';
import '../viewmodels/alice_oauth_viewmodel.dart';

final _launchStateProvider = StateProvider<bool>((_) => false);

class AliceConnectScreen extends ConsumerWidget {
  const AliceConnectScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final oauth    = ref.watch(aliceOAuthProvider);
    final launching = ref.watch(_launchStateProvider);

    // Show snackbar on error
    ref.listen(aliceOAuthProvider, (_, next) {
      if (next.status == AliceOAuthStatus.error && next.error != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(next.error!), backgroundColor: AppColors.danger),
        );
      }
    });

    return Scaffold(
      backgroundColor: AppColors.base,
      appBar: AppBar(title: const Text('Connect Alice Blue')),
      body: ListView(
        padding: const EdgeInsets.all(Spacing.xl2),
        children: [
          // Hero card
          GlassCard(
            borderColor: AppColors.success.withOpacity(0.3),
            gradient: LinearGradient(
              colors: [AppColors.success.withOpacity(0.08), Colors.transparent],
            ),
            child: Padding(
              padding: const EdgeInsets.all(Spacing.xl2),
              child: Column(children: [
                Container(
                  width: 64, height: 64,
                  decoration: BoxDecoration(
                    color: AppColors.success.withOpacity(0.15),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.link, color: AppColors.success, size: 32),
                ),
                const SizedBox(height: Spacing.lg),
                Text('Alice Blue Live Feed',
                    style: AppTypography.headingLg, textAlign: TextAlign.center),
                const SizedBox(height: Spacing.sm),
                Text(
                  'Connect your Alice Blue account to get real-time market prices in TraVirt.',
                  style: AppTypography.bodyMd,
                  textAlign: TextAlign.center,
                ),
              ]),
            ),
          ),

          const SizedBox(height: Spacing.xl2),

          // Steps
          Text('How it works', style: AppTypography.headingSm),
          const SizedBox(height: Spacing.md),
          ..._steps.asMap().entries.map((e) => _StepTile(
            number: e.key + 1,
            text: e.value,
          )),

          const SizedBox(height: Spacing.xl2),

          if (oauth.isConnected)
            GlassCard(
              borderColor: AppColors.success.withOpacity(0.4),
              child: Padding(
                padding: const EdgeInsets.all(Spacing.lg),
                child: Row(children: [
                  const Icon(Icons.check_circle, color: AppColors.success),
                  const SizedBox(width: Spacing.md),
                  Expanded(
                    child: Text('Alice Blue connected! Live prices are now active.',
                        style: AppTypography.bodyMd),
                  ),
                ]),
              ),
            )
          else if (oauth.status == AliceOAuthStatus.exchanging)
            GlassCard(
              child: Padding(
                padding: const EdgeInsets.all(Spacing.lg),
                child: Row(children: [
                  const SizedBox(
                    width: 20, height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                  const SizedBox(width: Spacing.md),
                  Text('Completing connection…', style: AppTypography.bodyMd),
                ]),
              ),
            )
          else
            TravirtButton(
              label: launching ? 'Opening Alice Blue…' : 'Connect Alice Blue',
              icon: Icons.open_in_new,
              isLoading: launching,
              onPressed: launching ? null : () => _startOAuth(context, ref),
            ),

          const SizedBox(height: Spacing.xl),

          GlassCard(
            child: Padding(
              padding: const EdgeInsets.all(Spacing.lg),
              child: Row(children: [
                const Icon(Icons.lock_outline, color: AppColors.muted, size: 16),
                const SizedBox(width: Spacing.md),
                Expanded(
                  child: Text(
                    'TraVirt only reads your market data. No order placement on your real account.',
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

  static const _steps = [
    'Tap "Connect Alice Blue" below',
    'Log in to Alice Blue ANT Web in the browser',
    'Approve TraVirt access — you\'ll be redirected back',
    'Live prices activate automatically',
  ];

  Future<void> _startOAuth(BuildContext context, WidgetRef ref) async {
    ref.read(_launchStateProvider.notifier).state = true;
    try {
      final res = await sl<ApiClient>().get('/broker/alice/auth-url');
      final url = (res.data as Map<String, dynamic>)['url'] as String?;
      if (url == null) throw Exception('No URL returned');

      final uri = Uri.parse(url);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
        // Deep link will handle the callback and update aliceOAuthProvider
      } else {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Could not open browser')),
          );
        }
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString()), backgroundColor: AppColors.danger),
        );
      }
    } finally {
      ref.read(_launchStateProvider.notifier).state = false;
    }
  }
}

class _StepTile extends StatelessWidget {
  const _StepTile({required this.number, required this.text});
  final int number;
  final String text;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: Spacing.md),
    child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Container(
        width: 28, height: 28,
        decoration: BoxDecoration(
          color: AppColors.primaryMuted,
          shape: BoxShape.circle,
        ),
        child: Center(
          child: Text('$number',
              style: AppTypography.labelSm.copyWith(color: AppColors.primary)),
        ),
      ),
      const SizedBox(width: Spacing.md),
      Expanded(
        child: Padding(
          padding: const EdgeInsets.only(top: 4),
          child: Text(text, style: AppTypography.bodyMd),
        ),
      ),
    ]),
  );
}
