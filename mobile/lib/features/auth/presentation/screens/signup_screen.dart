import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import '../../../../app/navigation/app_router.dart';
import '../../../../app/theme/colors.dart';
import '../../../../app/theme/typography.dart';
import '../../../../app/theme/spacing.dart';
import '../../../../shared/widgets/travirt_button.dart';
import '../../../../shared/widgets/glass_card.dart';
import '../viewmodels/auth_viewmodel.dart';

class SignupScreen extends ConsumerStatefulWidget {
  const SignupScreen({super.key});

  @override
  ConsumerState<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends ConsumerState<SignupScreen> {
  final _formKey    = GlobalKey<FormState>();
  final _userCtrl   = TextEditingController();
  final _emailCtrl  = TextEditingController();
  final _pwCtrl     = TextEditingController();
  final _cpwCtrl    = TextEditingController();
  bool _obscure     = true;

  @override
  void dispose() {
    _userCtrl.dispose(); _emailCtrl.dispose();
    _pwCtrl.dispose(); _cpwCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    final ok = await ref.read(authViewModelProvider.notifier).signup(
      username: _userCtrl.text,
      email: _emailCtrl.text,
      password: _pwCtrl.text,
    );
    if (!mounted) return;
    if (ok) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Account created! Please sign in.'),
          backgroundColor: AppColors.success,
        ),
      );
      context.go(AppRoutes.login);
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authViewModelProvider);

    ref.listen(authViewModelProvider, (_, next) {
      if (next.error != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(next.error!), backgroundColor: AppColors.danger),
        );
        ref.read(authViewModelProvider.notifier).clearError();
      }
    });

    return Scaffold(
      backgroundColor: AppColors.base,
      appBar: AppBar(
        leading: BackButton(onPressed: () => context.go(AppRoutes.login)),
        title: const Text('Create Account'),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(Spacing.xl2),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'Join TraVirt',
                  style: AppTypography.headingXl,
                ).animate().fadeIn().slideY(begin: 0.2, end: 0),
                const SizedBox(height: Spacing.sm),
                Text(
                  'Start with ₹10 lakh virtual balance',
                  style: AppTypography.bodyMd,
                ).animate(delay: 80.ms).fadeIn(),
                const SizedBox(height: Spacing.xl2),

                GlassCard(
                  child: Padding(
                    padding: const EdgeInsets.all(Spacing.xl2),
                    child: Column(
                      children: [
                        _field(_userCtrl, 'Username', Icons.badge_outlined,
                            validator: (v) => (v == null || v.trim().length < 3)
                                ? 'Min 3 characters'
                                : null),
                        const SizedBox(height: Spacing.lg),
                        _field(_emailCtrl, 'Email', Icons.email_outlined,
                            type: TextInputType.emailAddress,
                            validator: (v) =>
                                (v == null || !v.contains('@'))
                                    ? 'Valid email required'
                                    : null),
                        const SizedBox(height: Spacing.lg),
                        TextFormField(
                          controller: _pwCtrl,
                          obscureText: _obscure,
                          style: AppTypography.bodyLg,
                          decoration: InputDecoration(
                            labelText: 'Password',
                            prefixIcon: const Icon(Icons.lock_outline),
                            suffixIcon: IconButton(
                              icon: Icon(_obscure
                                  ? Icons.visibility_off_outlined
                                  : Icons.visibility_outlined),
                              onPressed: () =>
                                  setState(() => _obscure = !_obscure),
                            ),
                          ),
                          validator: (v) {
                            if (v == null || v.length < 8) return 'Min 8 chars';
                            if (!v.contains(RegExp(r'[A-Z]'))) return 'Add uppercase';
                            if (!v.contains(RegExp(r'[0-9]'))) return 'Add a number';
                            return null;
                          },
                        ),
                        const SizedBox(height: Spacing.lg),
                        _field(_cpwCtrl, 'Confirm Password', Icons.lock_outline,
                            obscure: true,
                            validator: (v) => v != _pwCtrl.text
                                ? 'Passwords do not match'
                                : null),
                        const SizedBox(height: Spacing.xl2),
                        TravirtButton(
                          label: 'Create Account',
                          onPressed: authState.isLoading ? null : _submit,
                          isLoading: authState.isLoading,
                          icon: Icons.rocket_launch,
                        ),
                      ],
                    ),
                  ),
                ).animate(delay: 150.ms).fadeIn().slideY(begin: 0.1, end: 0),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _field(
    TextEditingController ctrl,
    String label,
    IconData icon, {
    TextInputType type = TextInputType.text,
    bool obscure = false,
    String? Function(String?)? validator,
  }) =>
      TextFormField(
        controller: ctrl,
        obscureText: obscure,
        keyboardType: type,
        style: AppTypography.bodyLg,
        decoration: InputDecoration(
          labelText: label,
          prefixIcon: Icon(icon),
        ),
        validator: validator,
      );
}
