import 'package:flutter/material.dart';
import '../../theme/app_tokens.dart';

class RegisterScreen extends StatelessWidget {
  const RegisterScreen({super.key});

  void _goBackToLogin(BuildContext context) {
    Navigator.of(context).pushReplacementNamed('/login');
  }

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(title: const Text('Create account')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.l),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Get started', style: t.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
                  const SizedBox(height: AppSpacing.s),
                  Text(
                    'Create a new account for your blueprint workspace.',
                    style: t.bodySmall?.copyWith(color: AppColors.baseMuted),
                  ),
                  const SizedBox(height: AppSpacing.l),
                  TextField(decoration: const InputDecoration(labelText: 'Name')),
                  const SizedBox(height: AppSpacing.m),
                  TextField(decoration: const InputDecoration(labelText: 'Email')),
                  const SizedBox(height: AppSpacing.m),
                  TextField(obscureText: true, decoration: const InputDecoration(labelText: 'Password')),
                  const SizedBox(height: AppSpacing.l),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: () => _goBackToLogin(context),
                      child: const Text('Create account'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
