import 'package:flutter/material.dart';

import 'package:blueprint_mobile/auth/auth_flow_shell.dart';
import 'package:blueprint_mobile/theme/app_tokens.dart';

class ForgotPasswordScreen extends StatelessWidget {
  const ForgotPasswordScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    return AuthFlowShell(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Forgot your password?',
            style: t.titleMedium?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: AppSpacing.s),
          Text(
            "Enter your email address and we'll send you a reset link (in a real app).",
            style: t.bodySmall?.copyWith(color: AppColors.baseMuted),
          ),
          const SizedBox(height: AppSpacing.l),
          TextField(decoration: const InputDecoration(labelText: 'Email')),
          const SizedBox(height: AppSpacing.l),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Send reset link'),
            ),
          ),
          const SizedBox(height: AppSpacing.m),
          Center(
            child: TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Back to sign in'),
            ),
          ),
        ],
      ),
    );
  }
}
