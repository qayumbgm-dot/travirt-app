import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../app/di/injection_container.dart';
import '../../../../app/theme/colors.dart';
import '../../../../app/theme/typography.dart';
import '../../../../app/theme/spacing.dart';
import '../../../../core/network/api_client.dart';
import '../../../../shared/widgets/glass_card.dart';
import '../../../../shared/widgets/travirt_button.dart';

// ── Providers ────────────────────────────────────────────────────────────────

final _twoFaStatusProvider = FutureProvider<bool>((ref) async {
  final res = await sl<ApiClient>().get('/auth/2fa/status');
  return (res.data['enabled'] as bool?) ?? false;
});

// ── Screen ───────────────────────────────────────────────────────────────────

class SecurityScreen extends ConsumerWidget {
  const SecurityScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final statusAsync = ref.watch(_twoFaStatusProvider);

    return Scaffold(
      backgroundColor: AppColors.base,
      appBar: AppBar(title: const Text('Security & 2FA')),
      body: ListView(
        padding: const EdgeInsets.all(Spacing.xl2),
        children: [
          GlassCard(
            child: Padding(
              padding: const EdgeInsets.all(Spacing.xl),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(children: [
                    Container(
                      padding: const EdgeInsets.all(Spacing.md),
                      decoration: BoxDecoration(
                        color: AppColors.primaryMuted,
                        borderRadius: BorderRadius.circular(Radius.md),
                      ),
                      child: const Icon(Icons.lock_outlined,
                          color: AppColors.primary, size: 24),
                    ),
                    const SizedBox(width: Spacing.lg),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Two-Factor Authentication',
                              style: AppTypography.headingSm),
                          const SizedBox(height: 2),
                          Text(
                            'Add an extra layer of security with TOTP',
                            style: AppTypography.bodyMd,
                          ),
                        ],
                      ),
                    ),
                  ]),
                  const SizedBox(height: Spacing.xl),
                  statusAsync.when(
                    data: (enabled) => _TwoFaToggle(
                      enabled: enabled,
                      onChanged: () => ref.invalidate(_twoFaStatusProvider),
                    ),
                    loading: () => const Center(
                        child: CircularProgressIndicator()),
                    error: (e, _) => Text(e.toString(),
                        style: AppTypography.bodyMd
                            .copyWith(color: AppColors.danger)),
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: Spacing.xl),

          GlassCard(
            child: Padding(
              padding: const EdgeInsets.all(Spacing.xl),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Active Sessions', style: AppTypography.headingSm),
                  const SizedBox(height: Spacing.md),
                  Text(
                    'Session management coming soon. You can currently log out from all devices via Sign Out.',
                    style: AppTypography.bodyMd,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ── 2FA Toggle ───────────────────────────────────────────────────────────────

class _TwoFaToggle extends ConsumerWidget {
  const _TwoFaToggle({required this.enabled, required this.onChanged});
  final bool enabled;
  final VoidCallback onChanged;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (enabled) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            const Icon(Icons.check_circle, color: AppColors.success, size: 18),
            const SizedBox(width: Spacing.sm),
            Text('2FA is active', style: AppTypography.bodyLg
                .copyWith(color: AppColors.success)),
          ]),
          const SizedBox(height: Spacing.lg),
          TravirtButton(
            label: 'Disable 2FA',
            variant: ButtonVariant.danger,
            icon: Icons.lock_open_outlined,
            onPressed: () => _showDisableDialog(context, ref),
          ),
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(children: [
          const Icon(Icons.warning_amber_rounded,
              color: AppColors.warning, size: 18),
          const SizedBox(width: Spacing.sm),
          Text('2FA is not enabled',
              style: AppTypography.bodyLg.copyWith(color: AppColors.warning)),
        ]),
        const SizedBox(height: Spacing.lg),
        TravirtButton(
          label: 'Enable 2FA',
          icon: Icons.security_outlined,
          onPressed: () => _showSetupSheet(context, ref),
        ),
      ],
    );
  }

  Future<void> _showSetupSheet(BuildContext context, WidgetRef ref) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(Radius.xl)),
      ),
      builder: (_) => _TwoFaSetupSheet(onDone: onChanged),
    );
  }

  Future<void> _showDisableDialog(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: const Text('Disable 2FA'),
        content: const Text(
            'Are you sure you want to remove two-factor authentication? '
            'This will make your account less secure.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(foregroundColor: AppColors.danger),
            child: const Text('Disable'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    try {
      await sl<ApiClient>().post('/auth/2fa/disable', data: {});
      onChanged();
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('2FA disabled'),
          backgroundColor: AppColors.warning,
        ));
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('Failed: $e'),
          backgroundColor: AppColors.danger,
        ));
      }
    }
  }
}

// ── Setup Bottom Sheet ────────────────────────────────────────────────────────

enum _SetupStep { loading, scan, verify, done }

class _TwoFaSetupSheet extends StatefulWidget {
  const _TwoFaSetupSheet({required this.onDone});
  final VoidCallback onDone;

  @override
  State<_TwoFaSetupSheet> createState() => _TwoFaSetupSheetState();
}

class _TwoFaSetupSheetState extends State<_TwoFaSetupSheet> {
  _SetupStep _step = _SetupStep.loading;
  String _otpAuthUrl = '';
  String _secret = '';
  String _qrDataUrl = '';
  final _codeCtrl = TextEditingController();
  bool _verifying = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _initSetup();
  }

  @override
  void dispose() {
    _codeCtrl.dispose();
    super.dispose();
  }

  Future<void> _initSetup() async {
    try {
      final res = await sl<ApiClient>().post('/auth/2fa/setup', data: {});
      setState(() {
        _otpAuthUrl = res.data['otpauth_url'] as String? ?? '';
        _secret     = res.data['secret'] as String? ?? '';
        _qrDataUrl  = res.data['qr_code_url'] as String? ?? '';
        _step = _SetupStep.scan;
      });
    } catch (e) {
      if (mounted) Navigator.pop(context);
    }
  }

  Future<void> _verify() async {
    final code = _codeCtrl.text.trim();
    if (code.length != 6) {
      setState(() => _error = 'Enter the 6-digit code from your authenticator app');
      return;
    }
    setState(() { _verifying = true; _error = null; });
    try {
      await sl<ApiClient>().post('/auth/2fa/verify', data: {'token': code});
      setState(() { _step = _SetupStep.done; _verifying = false; });
    } catch (e) {
      setState(() {
        _error = 'Invalid code. Please try again.';
        _verifying = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: Spacing.xl2,
        right: Spacing.xl2,
        top: Spacing.xl2,
        bottom: MediaQuery.of(context).viewInsets.bottom + Spacing.xl2,
      ),
      child: AnimatedSwitcher(
        duration: const Duration(milliseconds: 250),
        child: switch (_step) {
          _SetupStep.loading => const SizedBox(
              height: 160,
              child: Center(child: CircularProgressIndicator()),
            ),
          _SetupStep.scan    => _ScanStep(
              secret: _secret,
              qrDataUrl: _qrDataUrl,
              otpAuthUrl: _otpAuthUrl,
              onNext: () => setState(() => _step = _SetupStep.verify),
            ),
          _SetupStep.verify  => _VerifyStep(
              ctrl: _codeCtrl,
              verifying: _verifying,
              error: _error,
              onVerify: _verify,
            ),
          _SetupStep.done    => _DoneStep(
              onClose: () {
                widget.onDone();
                Navigator.pop(context);
              },
            ),
        },
      ),
    );
  }
}

// ── Step Widgets ─────────────────────────────────────────────────────────────

class _ScanStep extends StatelessWidget {
  const _ScanStep({
    required this.secret,
    required this.qrDataUrl,
    required this.otpAuthUrl,
    required this.onNext,
  });
  final String secret;
  final String qrDataUrl;
  final String otpAuthUrl;
  final VoidCallback onNext;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Scan QR Code', style: AppTypography.headingLg),
        const SizedBox(height: Spacing.sm),
        Text(
          'Open your authenticator app (Google Authenticator, Authy, etc.) and scan this QR code.',
          style: AppTypography.bodyMd,
        ),
        const SizedBox(height: Spacing.xl2),

        if (qrDataUrl.isNotEmpty)
          Center(
            child: Container(
              padding: const EdgeInsets.all(Spacing.lg),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(Radius.md),
              ),
              child: Image.network(
                qrDataUrl,
                width: 180,
                height: 180,
                errorBuilder: (_, __, ___) => const Icon(
                  Icons.qr_code_2,
                  size: 180,
                  color: Colors.black,
                ),
              ),
            ),
          )
        else
          Center(
            child: Container(
              width: 180,
              height: 180,
              decoration: BoxDecoration(
                color: AppColors.overlay,
                borderRadius: BorderRadius.circular(Radius.md),
              ),
              child: const Icon(Icons.qr_code_2,
                  size: 100, color: AppColors.muted),
            ),
          ),

        const SizedBox(height: Spacing.xl2),

        Text('Or enter the key manually:', style: AppTypography.labelMd),
        const SizedBox(height: Spacing.sm),
        GestureDetector(
          onTap: () {
            Clipboard.setData(ClipboardData(text: secret));
            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
              content: Text('Secret key copied'),
              duration: Duration(seconds: 2),
            ));
          },
          child: Container(
            padding: const EdgeInsets.all(Spacing.md),
            decoration: BoxDecoration(
              color: AppColors.overlay,
              borderRadius: BorderRadius.circular(Radius.sm),
              border: Border.all(color: AppColors.overlayLight),
            ),
            child: Row(children: [
              Expanded(
                child: Text(
                  secret,
                  style: AppTypography.numericSm.copyWith(
                    letterSpacing: 2,
                    color: AppColors.primary,
                  ),
                ),
              ),
              const Icon(Icons.copy_outlined,
                  color: AppColors.muted, size: 18),
            ]),
          ),
        ),

        const SizedBox(height: Spacing.xl2),
        TravirtButton(label: 'Next', onPressed: onNext),
        const SizedBox(height: Spacing.md),
      ],
    );
  }
}

class _VerifyStep extends StatelessWidget {
  const _VerifyStep({
    required this.ctrl,
    required this.verifying,
    required this.error,
    required this.onVerify,
  });
  final TextEditingController ctrl;
  final bool verifying;
  final String? error;
  final VoidCallback onVerify;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Verify Setup', style: AppTypography.headingLg),
        const SizedBox(height: Spacing.sm),
        Text(
          'Enter the 6-digit code shown in your authenticator app to confirm setup.',
          style: AppTypography.bodyMd,
        ),
        const SizedBox(height: Spacing.xl2),

        TextFormField(
          controller: ctrl,
          keyboardType: TextInputType.number,
          maxLength: 6,
          autofocus: true,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          textAlign: TextAlign.center,
          style: AppTypography.displaySm.copyWith(letterSpacing: 8),
          decoration: InputDecoration(
            counterText: '',
            hintText: '000000',
            errorText: error,
          ),
        ),

        const SizedBox(height: Spacing.xl2),
        TravirtButton(
          label: 'Verify & Activate',
          isLoading: verifying,
          onPressed: verifying ? null : onVerify,
        ),
        const SizedBox(height: Spacing.md),
      ],
    );
  }
}

class _DoneStep extends StatelessWidget {
  const _DoneStep({required this.onClose});
  final VoidCallback onClose;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        const SizedBox(height: Spacing.xl),
        Container(
          padding: const EdgeInsets.all(Spacing.xl),
          decoration: BoxDecoration(
            color: AppColors.successMuted,
            shape: BoxShape.circle,
          ),
          child: const Icon(Icons.check_circle_outline,
              color: AppColors.success, size: 56),
        ),
        const SizedBox(height: Spacing.xl2),
        Text('2FA Enabled!', style: AppTypography.headingXl),
        const SizedBox(height: Spacing.md),
        Text(
          'Two-factor authentication is now active on your account. '
          'You will be prompted for a code on next login.',
          style: AppTypography.bodyLg,
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: Spacing.xl3),
        TravirtButton(label: 'Done', onPressed: onClose),
        const SizedBox(height: Spacing.md),
      ],
    );
  }
}
