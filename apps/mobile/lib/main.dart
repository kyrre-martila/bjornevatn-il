import 'package:flutter/material.dart';
import 'api/client.dart';
import 'screens/login_screen.dart';
import 'screens/profile_screen.dart';
import 'screens/register_screen.dart';
import 'services/auth_service.dart';
import 'theme/app_theme.dart';
import 'ui/app_shell.dart';

void main() => runApp(const BlueprintApp());

class BlueprintApp extends StatelessWidget {
  const BlueprintApp({super.key});

  static final GlobalKey<NavigatorState> _navigatorKey =
      GlobalKey<NavigatorState>();
  static final ApiClient _api = ApiClient();
  static final AuthService _auth = AuthService(
    navigatorKey: _navigatorKey,
    apiClient: _api,
  );

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Blueprint Mobile',
      navigatorKey: _navigatorKey,
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      home: const AppShell(),
      routes: {
        '/': (context) => const AppShell(),
        '/login': (context) => LoginScreen(api: _api),
        '/register': (context) => RegisterScreen(api: _api),
        '/profile': (context) => ProfileScreen(auth: _auth),
      },
    );
  }
}
