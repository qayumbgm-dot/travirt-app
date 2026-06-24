import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../app/navigation/app_router.dart';
import '../../../../app/theme/colors.dart';
import '../../../../app/theme/typography.dart';
import '../../../../app/theme/spacing.dart';
import '../../../../shared/widgets/travirt_button.dart';
import '../../../../shared/widgets/glass_card.dart';
import '../../../../app/di/injection_container.dart';
import '../../domain/repositories/auth_repository.dart';

class TfaScreen extends ConsumerStatefulWidget {
  const TfaScreen({super.key, required this.tempToken});
  final ({String tempToken, String userId}) tempToken;

  @override
  ConsumerState<TfaScreen> createState() => _TfaScreenState();
}

class _TfaScreenState extends ConsumerState<TfaScreen> {
  final _codeCtrl = TextEditingController();
  bool _loading = false;

  Future<void> _verify() async {
    if (_codeCtrl.text.trim().length != 6) return;
    setState(() => _loading = true);
    final result = await sl<AuthRepository>().verifyTfa(
      widget.tempToken.tempToken,
      _codeCtrl.text.trim(),
    );
    if (!mounted) return;
    setState(() => _loading = false);
    result.when(
      success: (_) => context.go(AppRoutes.dashboard),
      failure: (e) => ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.message), backgroundColor: AppColors.danger),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.base,
      appBar: AppBar(title: const Text('Two-Factor Auth')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(Spacing.xl2),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: Spacing.xl3),
              const Icon(Icons.security, size: 64, color: AppColors.primary),
              const SizedBox(height: Spacing.xl),
              Text('Verify Your Identity', style: AppTypography.headingXl,
                  textAlign: TextAlign.center),
              const SizedBox(height: Spacing.sm),
              Text('Enter the 6-digit code from your authenticator app.',
                  style: AppTypography.bodyMd, textAlign: TextAlign.center),
              const SizedBox(height: Spacing.xl3),
              GlassCard(
                child: Padding(
                  padding: const EdgeInsets.all(Spacing.xl2),
                  child: Column(children: [
                    TextFormField(
                      controller: _codeCtrl,
                      keyboardType: TextInputType.number,
                      maxLength: 6,
                      style: AppTypography.numericLg.copyWith(
                        letterSpacing: 8,
                      ),
                      textAlign: TextAlign.center,
                      decoration: const InputDecoration(
                        labelText: '6-digit code',
                        counterText: '',
                      ),
                    ),
                    const SizedBox(height: Spacing.xl),
                    TravirtButton(
                      label: 'Verify',
                      onPressed: _loading ? null : _verify,
                      isLoading: _loading,
                      icon: Icons.verified_user_outlined,
                    ),
                  ]),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
