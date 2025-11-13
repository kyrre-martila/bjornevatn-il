import 'package:flutter/material.dart';

import 'package:blueprint_mobile/auth/auth_controller.dart';
import 'package:blueprint_mobile/auth/auth_flow_shell.dart';
import 'package:blueprint_mobile/ui/auth/register_screen.dart';
import 'package:blueprint_mobile/ui/auth/forgot_password_screen.dart';
import 'package:blueprint_mobile/theme/app_tokens.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit(AuthController controller) async {
    if (!(_formKey.currentState?.validate() ?? false)) {
      return;
    }
    await controller.login(_emailCtrl.text.trim(), _passwordCtrl.text);
  }

  @override
  Widget build(BuildContext context) {
    final controller = context.auth;
    return AnimatedBuilder(
      animation: controller,
      builder: (context, _) {
        final state = controller.state;
        final isLoading = state.status == AuthStatus.authenticating;
        final error = state.status == AuthStatus.error
            ? state.errorMessage
            : null;

        return AuthFlowShell(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _LoginHeader(errorMessage: error),
              const SizedBox(height: AppSpacing.l),
              Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _LabeledField(
                      label: 'Email',
                      child: TextFormField(
                        controller: _emailCtrl,
                        keyboardType: TextInputType.emailAddress,
                        enabled: !isLoading,
                        decoration: const InputDecoration(
                          hintText: 'you@example.com',
                        ),
                        validator: (v) {
                          if (v == null || v.trim().isEmpty) {
                            return 'Please enter your email';
                          }
                          return null;
                        },
                      ),
                    ),
                    const SizedBox(height: AppSpacing.m),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Password',
                          style: Theme.of(context).textTheme.bodySmall
                              ?.copyWith(fontWeight: FontWeight.w500),
                        ),
                        TextButton(
                          onPressed: isLoading
                              ? null
                              : () {
                                  Navigator.of(context).push(
                                    MaterialPageRoute(
                                      builder: (_) =>
                                          const ForgotPasswordScreen(),
                                    ),
                                  );
                                },
                          child: const Text('Forgot password?'),
                        ),
                      ],
                    ),
                    TextFormField(
                      controller: _passwordCtrl,
                      obscureText: true,
                      enabled: !isLoading,
                      decoration: const InputDecoration(hintText: '••••••••'),
                      validator: (v) {
                        if (v == null || v.trim().isEmpty) {
                          return 'Please enter your password';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: AppSpacing.l),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton(
                        onPressed: isLoading ? null : () => _submit(controller),
                        child: isLoading
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                ),
                              )
                            : const Text('Sign in'),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.m),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    "Don't have an account?",
                    style: Theme.of(
                      context,
                    ).textTheme.bodySmall?.copyWith(color: AppColors.baseMuted),
                  ),
                  TextButton(
                    onPressed: isLoading
                        ? null
                        : () {
                            Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (_) => const RegisterScreen(),
                              ),
                            );
                          },
                    child: const Text('Create one'),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }
}

class _LoginHeader extends StatelessWidget {
  const _LoginHeader({this.errorMessage});

  final String? errorMessage;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Welcome back',
          style: textTheme.bodySmall?.copyWith(
            letterSpacing: 0.16,
            fontWeight: FontWeight.w500,
            color: AppColors.baseMuted,
          ),
        ),
        const SizedBox(height: AppSpacing.xs),
        Text(
          'Sign in to your account',
          style: textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: AppSpacing.s),
        Text(
          'Continue where you left off with your fullstack blueprint.',
          style: textTheme.bodySmall?.copyWith(color: AppColors.baseMuted),
        ),
        if (errorMessage != null) ...[
          const SizedBox(height: AppSpacing.m),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(AppSpacing.m),
            decoration: BoxDecoration(
              color: AppColors.errorSoft,
              borderRadius: BorderRadius.circular(AppRadius.m),
            ),
            child: Text(
              errorMessage!,
              style: textTheme.bodySmall?.copyWith(color: AppColors.error),
            ),
          ),
        ],
      ],
    );
  }
}

class _LabeledField extends StatelessWidget {
  const _LabeledField({required this.label, required this.child});

  final String label;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w500),
        ),
        const SizedBox(height: AppSpacing.xs),
        child,
      ],
    );
  }
}
