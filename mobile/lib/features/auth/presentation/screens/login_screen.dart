import 'dart:ui';
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

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey       = GlobalKey<FormState>();
  final _idCtrl        = TextEditingController();
  final _pwCtrl        = TextEditingController();
  bool _obscure        = true;

  @override
  void dispose() {
    _idCtrl.dispose();
    _pwCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    final tempToken = await ref
        .read(authViewModelProvider.notifier)
        .login(_idCtrl.text, _pwCtrl.text);
    if (!mounted) return;
    final state = ref.read(authViewModelProvider);
    if (state.requires2FA && tempToken != null) {
      context.go(AppRoutes.tfa, extra: (tempToken: tempToken, userId: _idCtrl.text));
    } else if (state.isAuthenticated) {
      context.go(AppRoutes.dashboard);
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authViewModelProvider);

    ref.listen(authViewModelProvider, (_, next) {
      if (next.error != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(next.error!, style: AppTypography.bodyMd),
            backgroundColor: AppColors.danger,
          ),
        );
        ref.read(authViewModelProvider.notifier).clearError();
      }
    });

    return Scaffold(
      backgroundColor: AppColors.base,
      body: Stack(
        fit: StackFit.expand,
        children: [
          // Ambient gradient
          Positioned(
            top: -120,
            right: -80,
            child: Container(
              width: 350,
              height: 350,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(colors: [
                  AppColors.primary.withOpacity(0.12),
                  Colors.transparent,
                ]),
              ),
            ),
          ),

          SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(
                horizontal: Spacing.xl2,
                vertical: Spacing.xl3,
              ),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const SizedBox(height: Spacing.xl3),

                    // Logo
                    Center(
                      child: Container(
                        width: 64,
                        height: 64,
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: AppColors.primaryGradient,
                          ),
                          borderRadius: BorderRadius.circular(16),
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.primary.withOpacity(0.35),
                              blurRadius: 24,
                              spreadRadius: 2,
                            ),
                          ],
                        ),
                        child: const Center(
                          child: Text('T', style: TextStyle(
                            fontFamily: 'Orbitron',
                            fontSize: 30,
                            fontWeight: FontWeight.w800,
                            color: Colors.white,
                          )),
                        ),
                      ),
                    ).animate().scale(duration: 500.ms, curve: Curves.easeOutBack),

                    const SizedBox(height: Spacing.xl),

                    Text(
                      'Welcome Back',
                      style: AppTypography.displaySm,
                      textAlign: TextAlign.center,
                    ).animate(delay: 100.ms).fadeIn().slideY(begin: 0.2, end: 0),

                    const SizedBox(height: Spacing.sm),

                    Text(
                      'Sign in to your TraVirt account',
                      style: AppTypography.bodyMd,
                      textAlign: TextAlign.center,
                    ).animate(delay: 150.ms).fadeIn(),

                    const SizedBox(height: Spacing.xl3),

                    // Glass card form
                    GlassCard(
                      child: Padding(
                        padding: const EdgeInsets.all(Spacing.xl2),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            TextFormField(
                              controller: _idCtrl,
                              style: AppTypography.bodyLg,
                              keyboardType: TextInputType.emailAddress,
                              autocorrect: false,
                              textInputAction: TextInputAction.next,
                              decoration: const InputDecoration(
                                labelText: 'User ID or Email',
                                prefixIcon: Icon(Icons.person_outline),
                              ),
                              validator: (v) =>
                                  (v == null || v.trim().isEmpty)
                                      ? 'Required'
                                      : null,
                            ),

                            const SizedBox(height: Spacing.lg),

                            TextFormField(
                              controller: _pwCtrl,
                              obscureText: _obscure,
                              style: AppTypography.bodyLg,
                              textInputAction: TextInputAction.done,
                              onFieldSubmitted: (_) => _submit(),
                              decoration: InputDecoration(
                                labelText: 'Password',
                                prefixIcon: const Icon(Icons.lock_outline),
                                suffixIcon: IconButton(
                                  icon: Icon(
                                    _obscure
                                        ? Icons.visibility_off_outlined
                                        : Icons.visibility_outlined,
                                  ),
                                  onPressed: () =>
                                      setState(() => _obscure = !_obscure),
                                ),
                              ),
                              validator: (v) =>
                                  (v == null || v.isEmpty) ? 'Required' : null,
                            ),

                            const SizedBox(height: Spacing.sm),

                            Align(
                              alignment: Alignment.centerRight,
                              child: TextButton(
                                onPressed: () => context.go(AppRoutes.forgotPw),
                                child: Text(
                                  'Forgot Password?',
                                  style: AppTypography.labelMd.copyWith(
                                    color: AppColors.primary,
                                  ),
                                ),
                              ),
                            ),

                            const SizedBox(height: Spacing.lg),

                            TravirtButton(
                              label: 'Sign In',
                              onPressed: authState.isLoading ? null : _submit,
                              isLoading: authState.isLoading,
                              icon: Icons.login,
                            ),
                          ],
                        ),
                      ),
                    ).animate(delay: 200.ms).fadeIn().slideY(begin: 0.1, end: 0),

                    const SizedBox(height: Spacing.xl2),

                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          "Don't have an account? ",
                          style: AppTypography.bodyMd,
                        ),
                        TextButton(
                          onPressed: () => context.go(AppRoutes.signup),
                          child: Text(
                            'Sign Up',
                            style: AppTypography.labelLg.copyWith(
                              color: AppColors.success,
                            ),
                          ),
                        ),
                      ],
                    ).animate(delay: 300.ms).fadeIn(),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
