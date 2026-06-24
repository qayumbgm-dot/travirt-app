import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../app/navigation/app_router.dart';
import '../../app/theme/colors.dart';
import '../../app/theme/spacing.dart';

class MainShell extends StatelessWidget {
  const MainShell({super.key, required this.child});
  final Widget child;

  static const _tabs = [
    _Tab(icon: Icons.dashboard_outlined,    activeIcon: Icons.dashboard,    label: 'Dashboard',   path: AppRoutes.dashboard),
    _Tab(icon: Icons.candlestick_chart_outlined, activeIcon: Icons.candlestick_chart, label: 'Trade', path: AppRoutes.trade),
    _Tab(icon: Icons.pie_chart_outline,     activeIcon: Icons.pie_chart,    label: 'Portfolio',   path: AppRoutes.portfolio),
    _Tab(icon: Icons.receipt_long_outlined, activeIcon: Icons.receipt_long, label: 'Orders',      path: AppRoutes.orders),
    _Tab(icon: Icons.menu_outlined,         activeIcon: Icons.menu,         label: 'More',        path: AppRoutes.more),
  ];

  int _locationToIndex(String location) {
    if (location.startsWith(AppRoutes.trade))      return 1;
    if (location.startsWith(AppRoutes.portfolio) ||
        location.startsWith(AppRoutes.pnlCalendar)) return 2;
    if (location.startsWith(AppRoutes.orders))     return 3;
    if (location.startsWith(AppRoutes.watchlist)   ||
        location.startsWith(AppRoutes.more)        ||
        location.startsWith(AppRoutes.leaderboard) ||
        location.startsWith(AppRoutes.aiNews)      ||
        location.startsWith(AppRoutes.brokerage)   ||
        location.startsWith(AppRoutes.billing)     ||
        location.startsWith(AppRoutes.funds)       ||
        location.startsWith(AppRoutes.profile)    ||
        location.startsWith(AppRoutes.settings))   return 4;
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;
    final currentIndex = _locationToIndex(location);

    return Scaffold(
      body: child,
      bottomNavigationBar: _BottomNav(
        currentIndex: currentIndex,
        tabs: _tabs,
        onTap: (i) => context.go(_tabs[i].path),
      ),
    );
  }
}

class _Tab {
  const _Tab({
    required this.icon,
    required this.activeIcon,
    required this.label,
    required this.path,
  });
  final IconData icon;
  final IconData activeIcon;
  final String label;
  final String path;
}

class _BottomNav extends StatelessWidget {
  const _BottomNav({
    required this.currentIndex,
    required this.tabs,
    required this.onTap,
  });

  final int currentIndex;
  final List<_Tab> tabs;
  final void Function(int) onTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surface,
        border: Border(top: BorderSide(color: AppColors.overlayLight)),
      ),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: 60,
          child: Row(
            children: tabs.asMap().entries.map((entry) {
              final i = entry.key;
              final tab = entry.value;
              final selected = currentIndex == i;
              return Expanded(
                child: InkWell(
                  onTap: () => onTap(i),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      AnimatedSwitcher(
                        duration: const Duration(milliseconds: 200),
                        child: Icon(
                          selected ? tab.activeIcon : tab.icon,
                          key: ValueKey(selected),
                          size: 22,
                          color: selected ? AppColors.primary : AppColors.muted,
                        ),
                      ),
                      const SizedBox(height: Spacing.xs),
                      Text(
                        tab.label,
                        style: TextStyle(
                          fontSize: 10,
                          fontFamily: 'Exo2',
                          fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
                          color: selected ? AppColors.primary : AppColors.muted,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
        ),
      ),
    );
  }
}
