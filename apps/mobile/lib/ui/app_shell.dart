import 'package:flutter/material.dart';

import 'package:blueprint_mobile/auth/auth_controller.dart';
import 'package:blueprint_mobile/theme/app_tokens.dart';

class AppShell extends StatefulWidget {
  const AppShell({super.key});

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  int _currentIndex = 0;

  void _onNavTap(int index) {
    setState(() => _currentIndex = index);
  }

  Future<void> _logout(BuildContext context) async {
    await context.auth.logout();
  }

  @override
  Widget build(BuildContext context) {
    final pages = <Widget>[
      const _HomePage(),
      const _PlaceholderPage(title: 'API'),
      const _PlaceholderPage(title: 'Mobile'),
      const _PlaceholderPage(title: 'Settings'),
    ];

    final navItems = const [
      _NavigationItem(icon: Icons.dashboard_outlined, label: 'Dashboard'),
      _NavigationItem(icon: Icons.api_outlined, label: 'API'),
      _NavigationItem(icon: Icons.phone_android_outlined, label: 'Mobile'),
      _NavigationItem(icon: Icons.settings_outlined, label: 'Settings'),
    ];

    final isWide = MediaQuery.of(context).size.width >= 900;

    return Scaffold(
      appBar: AppBar(
        title: const _AppBarTitle(),
        actions: [
          IconButton(
            onPressed: () => _logout(context),
            icon: const Icon(Icons.logout),
            tooltip: 'Log out',
          ),
        ],
      ),
      body: SafeArea(
        child: isWide
            ? Row(
                children: [
                  NavigationRail(
                    selectedIndex: _currentIndex,
                    onDestinationSelected: _onNavTap,
                    labelType: NavigationRailLabelType.all,
                    destinations: navItems
                        .map(
                          (item) => NavigationRailDestination(
                            icon: Icon(item.icon),
                            selectedIcon: Icon(item.selectedIcon ?? item.icon),
                            label: Text(item.label),
                          ),
                        )
                        .toList(),
                  ),
                  const VerticalDivider(width: 1),
                  Expanded(
                    child: IndexedStack(
                      index: _currentIndex,
                      children: pages,
                    ),
                  ),
                ],
              )
            : IndexedStack(
                index: _currentIndex,
                children: pages,
              ),
      ),
      bottomNavigationBar: isWide
          ? null
          : BottomNavigationBar(
              currentIndex: _currentIndex,
              onTap: _onNavTap,
              items: [
                for (final item in navItems)
                  BottomNavigationBarItem(
                    icon: Icon(item.icon),
                    label: item.label,
                  ),
              ],
            ),
    );
  }
}

class _NavigationItem {
  const _NavigationItem({
    required this.icon,
    required this.label,
    this.selectedIcon,
  });

  final IconData icon;
  final IconData? selectedIcon;
  final String label;
}

class _AppBarTitle extends StatelessWidget {
  const _AppBarTitle();

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Blueprint', style: t.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
        Text('Fullstack starter', style: t.bodySmall?.copyWith(color: AppColors.baseMuted)),
      ],
    );
  }
}

class _HomePage extends StatelessWidget {
  const _HomePage();

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    return Padding(
      padding: const EdgeInsets.all(AppSpacing.l),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Starter kit', style: t.bodySmall?.copyWith(letterSpacing: 0.12, fontWeight: FontWeight.w500)),
          const SizedBox(height: AppSpacing.s),
          Text('Hello world.\nRelease your fantasy.', style: t.titleLarge?.copyWith(fontWeight: FontWeight.w700)),
          const SizedBox(height: AppSpacing.m),
          Text(
            'This mobile app mirrors the web blueprint with shared design ideas and a clean shell for your features.',
            style: t.bodyMedium?.copyWith(color: AppColors.baseMuted),
          ),
          const SizedBox(height: AppSpacing.l),
          Wrap(
            spacing: AppSpacing.s,
            runSpacing: AppSpacing.s,
            children: [
              FilledButton(onPressed: () {}, child: const Text('Start building')),
              OutlinedButton(onPressed: () {}, child: const Text('Explore the code')),
            ],
          ),
        ],
      ),
    );
  }
}

class _PlaceholderPage extends StatelessWidget {
  final String title;
  const _PlaceholderPage({required this.title});

  @override
  Widget build(BuildContext context) {
    return Center(child: Text('$title page', style: Theme.of(context).textTheme.titleMedium));
  }
}
