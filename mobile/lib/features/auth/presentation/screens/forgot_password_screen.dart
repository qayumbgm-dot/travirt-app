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

class ForgotPasswordScreen extends ConsumerStatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  ConsumerState<ForgotPasswordScreen> createState() =>
      _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends ConsumerState<ForgotPasswordScreen> {
  final _emailCtrl = TextEditingController();
  bool _loading = false;
  bool _sent = false;

  Future<void> _submit() async {
    if (_emailCtrl.text.trim().isEmpty) return;
    setState(() => _loading = true);
    final result = await sl<AuthRepository>().forgotPassword(_emailCtrl.text.trim());
    if (!mounted) return;
    setState(() => _loading = false);
    result.when(
      success: (_) => setState(() => _sent = true),
      failure: (e) => ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.message), backgroundColor: AppColors.danger),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.base,
      appBar: AppBar(
        leading: BackButton(onPressed: () => context.go(AppRoutes.login)),
        title: const Text('Reset Password'),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(Spacing.xl2),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: Spacing.xl2),
              if (!_sent) ...[
                Text('Forgot Password?', style: AppTypography.headingXl),
                const SizedBox(height: Spacing.sm),
                Text(
                  'Enter your email and we\'ll send a reset link.',
                  style: AppTypography.bodyMd,
                ),
                const SizedBox(height: Spacing.xl2),
                GlassCard(
                  child: Padding(
                    padding: const EdgeInsets.all(Spacing.xl2),
                    child: Column(children: [
                      TextFormField(
                        controller: _emailCtrl,
                        keyboardType: TextInputType.emailAddress,
                        style: AppTypography.bodyLg,
                        decoration: const InputDecoration(
                          labelText: 'Email Address',
                          prefixIcon: Icon(Icons.email_outlined),
                        ),
                      ),
                      const SizedBox(height: Spacing.xl),
                      TravirtButton(
                        label: 'Send Reset Link',
                        onPressed: _loading ? null : _submit,
                        isLoading: _loading,
                        icon: Icons.send_outlined,
                      ),
                    ]),
                  ),
                ),
              ] else ...[
                const Icon(Icons.mark_email_read_outlined,
                    size: 64, color: AppColors.success),
                const SizedBox(height: Spacing.xl),
                Text('Check Your Email', style: AppTypography.headingXl,
                    textAlign: TextAlign.center),
                const SizedBox(height: Spacing.sm),
                Text(
                  'We\'ve sent a password reset link to ${_emailCtrl.text}',
                  style: AppTypography.bodyMd,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: Spacing.xl3),
                TravirtButton(
                  label: 'Back to Login',
                  onPressed: () => context.go(AppRoutes.login),
                  variant: ButtonVariant.outline,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
