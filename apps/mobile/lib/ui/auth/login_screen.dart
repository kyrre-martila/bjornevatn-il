import 'package:flutter/material.dart';
import '../../theme/app_tokens.dart';

class LoginScreen extends StatelessWidget {
  const LoginScreen({super.key});

  void _goToApp(BuildContext context) {
    Navigator.of(context).pushReplacementNamed('/app');
  }

  void _goToRegister(BuildContext context) {
    Navigator.of(context).pushNamed('/register');
  }

  void _goToForgotPassword(BuildContext context) {
    Navigator.of(context).pushNamed('/forgot-password');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.neutral,
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final isTablet = constraints.maxWidth >= 800;

            if (isTablet) {
              // Tablet & up: two-pane split (visual left, form right)
              return Row(
                children: [
                  Expanded(
                    flex: 5,
                    child: _VisualPane(padding: const EdgeInsets.all(AppSpacing.xl)),
                  ),
                  Expanded(
                    flex: 4,
                    child: Center(
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 480),
                        child: Card(
                          elevation: 1,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(AppRadius.l),
                          ),
                          child: Padding(
                            padding: const EdgeInsets.all(AppSpacing.xl),
                            child: _LoginForm(
                              onSignIn: _goToApp,
                              onGoToRegister: _goToRegister,
                              onGoToForgot: _goToForgotPassword,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              );
            }

            // Phone: stacked (hero on top, form below)
            return Column(
              children: [
                SizedBox(
                  height: 220, width: double.infinity,
                  child: _VisualPane(padding: const EdgeInsets.all(AppSpacing.l)),
                ),
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.l, vertical: AppSpacing.l),
                    child: Center(
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 420),
                        child: Card(
                          elevation: 1,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(AppRadius.l),
                          ),
                          child: Padding(
                            padding: const EdgeInsets.all(AppSpacing.l),
                            child: _LoginForm(
                              onSignIn: _goToApp,
                              onGoToRegister: _goToRegister,
                              onGoToForgot: _goToForgotPassword,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _VisualPane extends StatelessWidget {
  final EdgeInsetsGeometry padding;
  const _VisualPane({required this.padding});

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;

    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [AppColors.secondary, AppColors.accent],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Stack(
        children: [
          Positioned(
            top: -40, right: -40,
            child: Container(
              width: 140, height: 140,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withOpacity(0.22),
              ),
            ),
          ),
          Positioned.fill(
            child: Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.bottomLeft, end: Alignment.topRight,
                  colors: [Color.fromARGB(110, 0, 0, 0), Color.fromARGB(0, 0, 0, 0)],
                ),
              ),
            ),
          ),
          Positioned.fill(
            child: Padding(
              padding: padding,
              child: Align(
                alignment: Alignment.bottomLeft,
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 520),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Blueprint',
                        style: t.bodySmall?.copyWith(
                          color: AppColors.neutral0,
                          letterSpacing: 0.16,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xs),
                      Text('Build once.\nDeploy everywhere.',
                        style: t.titleLarge?.copyWith(
                          color: AppColors.neutral0,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.s),
                      Text('A fullstack starter so you can focus on features and vibes.',
                        style: t.bodySmall?.copyWith(
                          color: AppColors.neutral0.withOpacity(0.9),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _LoginForm extends StatefulWidget {
  final void Function(BuildContext) onSignIn;
  final void Function(BuildContext) onGoToRegister;
  final void Function(BuildContext) onGoToForgot;

  const _LoginForm({
    required this.onSignIn,
    required this.onGoToRegister,
    required this.onGoToForgot,
  });

  @override
  State<_LoginForm> createState() => _LoginFormState();
}

class _LoginFormState extends State<_LoginForm> {
  final _formKey = GlobalKey<FormState>();
  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  void _submit() {
    if (_formKey.currentState?.validate() ?? false) {
      widget.onSignIn(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Welcome back',
          style: t.bodySmall?.copyWith(
            letterSpacing: 0.16, fontWeight: FontWeight.w500, color: AppColors.baseMuted,
          ),
        ),
        const SizedBox(height: AppSpacing.xs),
        Text('Sign in to your account',
          style: t.titleMedium?.copyWith(fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: AppSpacing.s),
        Text('Continue where you left off with your fullstack blueprint.',
          style: t.bodySmall?.copyWith(color: AppColors.baseMuted),
        ),
        const SizedBox(height: AppSpacing.l),

        Form(
          key: _formKey,
          child: Column(
            children: [
              Align(
                alignment: Alignment.centerLeft,
                child: Text('Email',
                  style: t.bodySmall?.copyWith(fontWeight: FontWeight.w500),
                ),
              ),
              const SizedBox(height: AppSpacing.xs),
              TextFormField(
                controller: _emailCtrl,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(hintText: 'you@example.com'),
                validator: (v) =>
                  (v == null || v.trim().isEmpty) ? 'Please enter your email' : null,
              ),
              const SizedBox(height: AppSpacing.m),

              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Password', style: t.bodySmall?.copyWith(fontWeight: FontWeight.w500)),
                  TextButton(
                    onPressed: () => widget.onGoToForgot(context),
                    child: const Text('Forgot password?'),
                  ),
                ],
              ),
              TextFormField(
                controller: _passwordCtrl,
                obscureText: true,
                decoration: const InputDecoration(hintText: '••••••••'),
                validator: (v) =>
                  (v == null || v.trim().isEmpty) ? 'Please enter your password' : null,
              ),
              const SizedBox(height: AppSpacing.l),

              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: _submit,
                  child: const Text('Sign in'),
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: AppSpacing.m),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text("Don't have an account?", style: t.bodySmall?.copyWith(color: AppColors.baseMuted)),
            TextButton(
              onPressed: () => widget.onGoToRegister(context),
              child: const Text('Create one'),
            ),
          ],
        ),
      ],
    );
  }
}
