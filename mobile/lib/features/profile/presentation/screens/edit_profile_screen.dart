import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../app/di/injection_container.dart';
import '../../../../core/network/api_client.dart';
import '../../../../app/theme/colors.dart';
import '../../../../app/theme/typography.dart';
import '../../../../app/theme/spacing.dart';
import '../../../../shared/widgets/travirt_button.dart';
import '../../../auth/presentation/viewmodels/auth_viewmodel.dart';

final _savingProvider = StateProvider<bool>((ref) => false);

class EditProfileScreen extends ConsumerStatefulWidget {
  const EditProfileScreen({super.key});

  @override
  ConsumerState<EditProfileScreen> createState() =>
      _EditProfileScreenState();
}

class _EditProfileScreenState extends ConsumerState<EditProfileScreen> {
  late final TextEditingController _usernameCtrl;
  final _formKey = GlobalKey<FormState>();

  @override
  void initState() {
    super.initState();
    final user = ref.read(authViewModelProvider).user;
    _usernameCtrl = TextEditingController(text: user?.username ?? '');
  }

  @override
  void dispose() {
    _usernameCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    ref.read(_savingProvider.notifier).state = true;
    try {
      await sl<ApiClient>().patch('/auth/profile', data: {
        'username': _usernameCtrl.text.trim(),
      });
      await ref.read(authViewModelProvider.notifier).refreshSession();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Profile updated'),
            backgroundColor: AppColors.success,
          ),
        );
        context.pop();
      }
    } catch (e) {
      final msg = 'Update failed';
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(msg.toString()),
            backgroundColor: AppColors.danger,
          ),
        );
      }
    } finally {
      if (mounted) ref.read(_savingProvider.notifier).state = false;
    }
  }

  @override
  Widget build(BuildContext context) {
    final saving = ref.watch(_savingProvider);
    final user = ref.watch(authViewModelProvider).user;

    return Scaffold(
      backgroundColor: AppColors.base,
      appBar: AppBar(title: const Text('Edit Profile')),
      body: Padding(
        padding: const EdgeInsets.all(Spacing.xl2),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Avatar (non-editable, just visual)
              Center(
                child: CircleAvatar(
                  radius: 44,
                  backgroundColor: AppColors.primaryMuted,
                  child: Text(
                    (user?.username ?? 'T')[0].toUpperCase(),
                    style: AppTypography.displayMd
                        .copyWith(color: AppColors.primary),
                  ),
                ),
              ),
              const SizedBox(height: Spacing.xl3),

              Text('Username', style: AppTypography.labelMd),
              const SizedBox(height: Spacing.sm),
              TextFormField(
                controller: _usernameCtrl,
                style: AppTypography.bodyLg,
                decoration: const InputDecoration(
                  hintText: 'Enter username',
                  prefixIcon: Icon(Icons.person_outline),
                ),
                validator: (v) {
                  if (v == null || v.trim().isEmpty) {
                    return 'Username is required';
                  }
                  if (v.trim().length < 3) {
                    return 'Minimum 3 characters';
                  }
                  if (!RegExp(r'^[a-zA-Z0-9_]+$').hasMatch(v.trim())) {
                    return 'Only letters, numbers and underscores';
                  }
                  return null;
                },
              ),

              const SizedBox(height: Spacing.xl),
              Text('Email', style: AppTypography.labelMd),
              const SizedBox(height: Spacing.sm),
              TextFormField(
                initialValue: user?.email ?? '',
                style: AppTypography.bodyLg.copyWith(color: AppColors.muted),
                enabled: false,
                decoration: const InputDecoration(
                  prefixIcon: Icon(Icons.email_outlined),
                ),
              ),

              const Spacer(),

              TravirtButton(
                label: saving ? 'Saving…' : 'Save Changes',
                onPressed: saving ? null : _save,
              ),
              const SizedBox(height: Spacing.xl2),
            ],
          ),
        ),
      ),
    );
  }
}
