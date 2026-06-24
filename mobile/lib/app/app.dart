import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'navigation/app_router.dart';
import 'theme/app_theme.dart';
import '../core/network/price_feed_service.dart';
import '../core/notifications/notification_service.dart';
import '../shared/widgets/offline_banner.dart';
import '../features/auth/presentation/state/auth_state.dart';
import '../features/auth/presentation/viewmodels/auth_viewmodel.dart';

class TravirtApp extends ConsumerStatefulWidget {
  const TravirtApp({super.key});

  @override
  ConsumerState<TravirtApp> createState() => _TravirtAppState();
}

class _TravirtAppState extends ConsumerState<TravirtApp> {
  StreamSubscription<String>? _notifSub;

  @override
  void initState() {
    super.initState();
    ref.read(notificationServiceProvider).init();
    // Subscribe after first frame so router is available
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _notifSub = notificationRouteController.stream.listen((route) {
        ref.read(appRouterProvider).go(route);
      });
    });
  }

  @override
  void dispose() {
    _notifSub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final router = ref.watch(appRouterProvider);

    // Connect / disconnect WS feed based on auth state
    ref.listen<AuthState>(authViewModelProvider, (prev, next) {
      final feed = ref.read(priceFeedServiceProvider);
      if (next.status == AuthStatus.authenticated) {
        feed.connect();
      } else if (next.status == AuthStatus.unauthenticated) {
        feed.disconnect();
      }
    });

    return MaterialApp.router(
      title: 'TraVirt',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.dark(),
      darkTheme: AppTheme.dark(),
      themeMode: ThemeMode.dark,
      routerConfig: router,
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: const [
        Locale('en', 'IN'),
        Locale('hi', 'IN'),
      ],
      builder: (context, child) {
        return MediaQuery(
          data: MediaQuery.of(context).copyWith(
            textScaler: TextScaler.linear(
              MediaQuery.of(context).textScaler.scale(1.0).clamp(0.85, 1.15),
            ),
          ),
          child: OfflineBanner(child: child!),
        );
      },
    );
  }
}
