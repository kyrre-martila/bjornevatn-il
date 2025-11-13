import 'package:flutter/material.dart';

import 'package:blueprint_mobile/auth/auth_controller.dart';
import 'package:blueprint_mobile/auth/auth_gate.dart';
import 'package:blueprint_mobile/auth/auth_service.dart';
import 'package:blueprint_mobile/theme/app_theme.dart';
import 'package:blueprint_mobile/ui/app_shell.dart';
import 'package:blueprint_mobile/ui/auth/forgot_password_screen.dart';
import 'package:blueprint_mobile/ui/auth/login_screen.dart';
import 'package:blueprint_mobile/ui/auth/register_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  final authService = AuthService();
  final authController = AuthController(authService);

  runApp(
    AuthScope(
      controller: authController,
      child: BlueprintApp(authController: authController),
    ),
  );
}

class BlueprintApp extends StatefulWidget {
  const BlueprintApp({super.key, required this.authController});

  final AuthController authController;

  @override
  State<BlueprintApp> createState() => _BlueprintAppState();
}

class _BlueprintAppState extends State<BlueprintApp> {
  @override
  void initState() {
    super.initState();
    widget.authController.restoreSession();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Blueprint Mobile',
      theme: AppTheme.light,
      debugShowCheckedModeBanner: false,
      home: const _AuthGateRouter(),
    );
  }
}

class _AuthGateRouter extends StatelessWidget {
  const _AuthGateRouter();

  @override
  Widget build(BuildContext context) {
    return AuthGate(
      buildAuthenticated: (_) => const AppShell(),
      buildUnauthenticated: (_) => const _AuthFlowNavigator(),
    );
  }
}

class _AuthFlowNavigator extends StatelessWidget {
  const _AuthFlowNavigator();

  @override
  Widget build(BuildContext context) {
    return Navigator(
      initialRoute: '/login',
      onGenerateRoute: (settings) {
        switch (settings.name) {
          case '/register':
            return MaterialPageRoute(builder: (_) => const RegisterScreen());
          case '/forgot-password':
            return MaterialPageRoute(builder: (_) => const ForgotPasswordScreen());
          case '/login':
          case '/':
          default:
            return MaterialPageRoute(builder: (_) => const LoginScreen());
        }
      },
    );
  }
}
