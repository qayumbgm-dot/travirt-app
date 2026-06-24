import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../../app/navigation/app_router.dart';
import '../../../../app/theme/colors.dart';
import '../../../../app/theme/typography.dart';
import '../viewmodels/auth_viewmodel.dart';

class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _navigate();
  }

  Future<void> _navigate() async {
    await Future.delayed(const Duration(milliseconds: 2200));
    if (!mounted) return;

    // First launch → show onboarding
    final prefs = await SharedPreferences.getInstance();
    final onboarded = prefs.getBool('onboarded') ?? false;
    if (!onboarded) {
      if (mounted) context.go(AppRoutes.onboarding);
      return;
    }

    final authState = ref.read(authViewModelProvider);
    if (authState.isAuthenticated) {
      context.go(AppRoutes.dashboard);
    } else if (authState.status != AuthStatus.initial &&
        authState.status != AuthStatus.loading) {
      context.go(AppRoutes.login);
    } else {
      ref.listenManual(authViewModelProvider, (_, next) {
        if (!mounted) return;
        if (next.isAuthenticated) {
          context.go(AppRoutes.dashboard);
        } else if (next.status != AuthStatus.initial &&
            next.status != AuthStatus.loading) {
          context.go(AppRoutes.login);
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.base,
      body: Stack(
        fit: StackFit.expand,
        children: [
          // Ambient glow
          Positioned(
            top: -100,
            left: -100,
            child: Container(
              width: 400,
              height: 400,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    AppColors.primary.withOpacity(0.15),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),
          Positioned(
            bottom: -80,
            right: -80,
            child: Container(
              width: 300,
              height: 300,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    AppColors.success.withOpacity(0.1),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),

          // Logo + wordmark
          Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Orbitron logo mark
                Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: AppColors.primaryGradient,
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primary.withOpacity(0.4),
                        blurRadius: 30,
                        spreadRadius: 4,
                      ),
                    ],
                  ),
                  child: const Center(
                    child: Text(
                      'T',
                      style: TextStyle(
                        fontFamily: 'Orbitron',
                        fontSize: 40,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                      ),
                    ),
                  ),
                )
                    .animate()
                    .scale(duration: 600.ms, curve: Curves.easeOutBack)
                    .fadeIn(duration: 400.ms),

                const SizedBox(height: 20),

                Text('TRAVIRT', style: AppTypography.displayMd)
                    .animate(delay: 400.ms)
                    .fadeIn(duration: 500.ms)
                    .slideY(begin: 0.3, end: 0),

                const SizedBox(height: 8),

                Text(
                  'Virtual Trading Platform',
                  style: AppTypography.bodyMd,
                )
                    .animate(delay: 600.ms)
                    .fadeIn(duration: 500.ms),
              ],
            ),
          ),

          // Bottom progress
          Positioned(
            bottom: 60,
            left: 0,
            right: 0,
            child: Center(
              child: SizedBox(
                width: 120,
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(2),
                  child: const LinearProgressIndicator(
                    backgroundColor: AppColors.overlay,
                    color: AppColors.primary,
                    minHeight: 2,
                  ),
                ),
              )
                  .animate(delay: 800.ms)
                  .fadeIn(duration: 400.ms),
            ),
          ),
        ],
      ),
    );
  }
}
