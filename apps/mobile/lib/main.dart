import 'package:flutter/material.dart';
import 'theme/app_theme.dart';
import 'ui/app_shell.dart';
import 'ui/auth/login_screen.dart';
import 'ui/auth/register_screen.dart';
import 'ui/auth/forgot_password_screen.dart';

void main() {
  runApp(const BlueprintApp());
}

class BlueprintApp extends StatelessWidget {
  const BlueprintApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Blueprint Mobile',
      theme: AppTheme.light,
      debugShowCheckedModeBanner: false,
      initialRoute: '/login',
      routes: {
        '/login': (context) => const LoginScreen(),
        '/register': (context) => const RegisterScreen(),
        '/forgot-password': (context) => const ForgotPasswordScreen(),
        '/app': (context) => const AppShell(),
      },
    );
  }
}
