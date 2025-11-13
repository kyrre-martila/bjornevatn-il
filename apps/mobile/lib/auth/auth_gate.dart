import 'package:flutter/material.dart';

import 'auth_controller.dart';

class AuthGate extends StatelessWidget {
  const AuthGate({
    super.key,
    required this.buildAuthenticated,
    required this.buildUnauthenticated,
  });

  final WidgetBuilder buildAuthenticated;
  final WidgetBuilder buildUnauthenticated;

  @override
  Widget build(BuildContext context) {
    final controller = context.auth;
    return AnimatedBuilder(
      animation: controller,
      builder: (context, _) {
        final state = controller.state;
        switch (state.status) {
          case AuthStatus.unknown:
            return const _Splash();
          case AuthStatus.authenticated:
            return buildAuthenticated(context);
          case AuthStatus.authenticating:
          case AuthStatus.unauthenticated:
          case AuthStatus.error:
            return buildUnauthenticated(context);
        }
      },
    );
  }
}

class _Splash extends StatelessWidget {
  const _Splash();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(body: Center(child: CircularProgressIndicator()));
  }
}
