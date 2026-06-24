import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../app/theme/colors.dart';
import '../../../../app/theme/typography.dart';
import '../../../../app/theme/spacing.dart';
import '../../../../shared/widgets/glass_card.dart';
import '../../../../shared/widgets/travirt_button.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/constants/api_constants.dart';
import '../../../../app/di/injection_container.dart';

class ChangePasswordScreen extends ConsumerStatefulWidget {
  const ChangePasswordScreen({super.key});

  @override
  ConsumerState<ChangePasswordScreen> createState() =>
      _ChangePasswordScreenState();
}

class _ChangePasswordScreenState extends ConsumerState<ChangePasswordScreen> {
  final _formKey    = GlobalKey<FormState>();
  final _currentCtrl = TextEditingController();
  final _newCtrl     = TextEditingController();
  final _confirmCtrl = TextEditingController();
  bool _loading      = false;
  bool _showCurrent  = false;
  bool _showNew      = false;
  bool _showConfirm  = false;

  @override
  void dispose() {
    _currentCtrl.dispose();
    _newCtrl.dispose();
    _confirmCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() => _loading = true);
    try {
      await sl<ApiClient>().post(ApiConstants.changePassword, data: {
        'currentPassword': _currentCtrl.text,
        'newPassword':     _newCtrl.text,
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Password changed successfully'),
          backgroundColor: AppColors.success,
        ),
      );
      context.pop();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.toString()),
          backgroundColor: AppColors.danger,
        ),
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.base,
      appBar: AppBar(title: const Text('Change Password')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(Spacing.xl2),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              GlassCard(
                child: Padding(
                  padding: const EdgeInsets.all(Spacing.xl2),
                  child: Column(children: [
                    _PasswordField(
                      controller: _currentCtrl,
                      label: 'Current Password',
                      show: _showCurrent,
                      onToggle: () =>
                          setState(() => _showCurrent = !_showCurrent),
                      validator: (v) =>
                          (v == null || v.isEmpty) ? 'Required' : null,
                    ),
                    const SizedBox(height: Spacing.xl),
                    _PasswordField(
                      controller: _newCtrl,
                      label: 'New Password',
                      show: _showNew,
                      onToggle: () => setState(() => _showNew = !_showNew),
                      validator: (v) {
                        if (v == null || v.isEmpty) return 'Required';
                        if (v.length < 8) return 'Minimum 8 characters';
                        if (!v.contains(RegExp(r'[A-Z]')))
                          return 'Must contain an uppercase letter';
                        if (!v.contains(RegExp(r'[0-9]')))
                          return 'Must contain a number';
                        return null;
                      },
                    ),
                    const SizedBox(height: Spacing.xl),
                    _PasswordField(
                      controller: _confirmCtrl,
                      label: 'Confirm New Password',
                      show: _showConfirm,
                      onToggle: () =>
                          setState(() => _showConfirm = !_showConfirm),
                      validator: (v) => v != _newCtrl.text
                          ? 'Passwords do not match'
                          : null,
                    ),
                  ]),
                ),
              ),

              const SizedBox(height: Spacing.xl),

              // Password rules hint
              GlassCard(
                child: Padding(
                  padding: const EdgeInsets.all(Spacing.lg),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Password requirements',
                          style: AppTypography.labelMd),
                      const SizedBox(height: Spacing.sm),
                      ...[
                        'At least 8 characters',
                        'One uppercase letter (A–Z)',
                        'One number (0–9)',
                      ].map((r) => Padding(
                        padding: const EdgeInsets.only(bottom: 4),
                        child: Row(children: [
                          const Icon(Icons.check_circle_outline,
                              size: 14, color: AppColors.muted),
                          const SizedBox(width: Spacing.sm),
                          Text(r, style: AppTypography.bodySm),
                        ]),
                      )),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: Spacing.xl2),

              TravirtButton(
                label: 'Update Password',
                isLoading: _loading,
                onPressed: _loading ? null : _submit,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PasswordField extends StatelessWidget {
  const _PasswordField({
    required this.controller,
    required this.label,
    required this.show,
    required this.onToggle,
    required this.validator,
  });
  final TextEditingController controller;
  final String label;
  final bool show;
  final VoidCallback onToggle;
  final String? Function(String?) validator;

  @override
  Widget build(BuildContext context) => TextFormField(
    controller: controller,
    obscureText: !show,
    style: AppTypography.bodyLg,
    validator: validator,
    decoration: InputDecoration(
      labelText: label,
      prefixIcon: const Icon(Icons.lock_outline),
      suffixIcon: IconButton(
        icon: Icon(show ? Icons.visibility_off : Icons.visibility),
        onPressed: onToggle,
      ),
    ),
  );
}
