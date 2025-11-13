import 'package:flutter/material.dart';

import 'auth_service.dart';

enum AuthStatus {
  unknown,
  unauthenticated,
  authenticating,
  authenticated,
  error,
}

class AuthState {
  final AuthStatus status;
  final AuthUser? user;
  final String? errorMessage;

  const AuthState({required this.status, this.user, this.errorMessage});

  AuthState copyWith({
    AuthStatus? status,
    AuthUser? user,
    bool clearUser = false,
    String? errorMessage,
    bool clearError = false,
  }) {
    return AuthState(
      status: status ?? this.status,
      user: clearUser ? null : (user ?? this.user),
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }
}

class AuthController extends ChangeNotifier {
  AuthController(this._service);

  final AuthService _service;

  AuthState _state = const AuthState(status: AuthStatus.unknown);

  AuthState get state => _state;

  Future<void> restoreSession() async {
    _updateState(const AuthState(status: AuthStatus.unknown));
    try {
      final session = await _service.restoreSession();
      if (session == null) {
        _updateState(const AuthState(status: AuthStatus.unauthenticated));
      } else {
        _updateState(
          AuthState(status: AuthStatus.authenticated, user: session.user),
        );
      }
    } on AuthException catch (error) {
      _updateState(
        AuthState(status: AuthStatus.error, errorMessage: error.message),
      );
    } catch (_) {
      _updateState(const AuthState(status: AuthStatus.unauthenticated));
    }
  }

  Future<void> login(String email, String password) async {
    _updateState(
      _state.copyWith(status: AuthStatus.authenticating, clearError: true),
    );
    try {
      final session = await _service.login(email: email, password: password);
      _updateState(
        AuthState(status: AuthStatus.authenticated, user: session.user),
      );
    } on AuthException catch (error) {
      _updateState(
        AuthState(status: AuthStatus.error, errorMessage: error.message),
      );
    } catch (_) {
      _updateState(
        const AuthState(
          status: AuthStatus.error,
          errorMessage: 'Something went wrong. Please try again.',
        ),
      );
    }
  }

  Future<void> register(String email, String password, {String? name}) async {
    _updateState(
      _state.copyWith(status: AuthStatus.authenticating, clearError: true),
    );
    try {
      final session = await _service.register(
        email: email,
        password: password,
        name: name,
      );
      _updateState(
        AuthState(status: AuthStatus.authenticated, user: session.user),
      );
    } on AuthException catch (error) {
      _updateState(
        AuthState(status: AuthStatus.error, errorMessage: error.message),
      );
    } catch (_) {
      _updateState(
        const AuthState(
          status: AuthStatus.error,
          errorMessage: 'Something went wrong. Please try again.',
        ),
      );
    }
  }

  Future<void> logout() async {
    await _service.clearSession();
    _updateState(const AuthState(status: AuthStatus.unauthenticated));
  }

  void _updateState(AuthState state) {
    _state = state;
    notifyListeners();
  }
}

class AuthScope extends InheritedNotifier<AuthController> {
  const AuthScope({super.key, required this.controller, required Widget child})
    : super(notifier: controller, child: child);

  final AuthController controller;

  static AuthController of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<AuthScope>();
    assert(
      scope != null,
      'AuthScope.of() called with a context that has no AuthScope.',
    );
    return scope!.controller;
  }

  @override
  bool updateShouldNotify(covariant AuthScope oldWidget) =>
      controller != oldWidget.controller;
}

extension AuthContext on BuildContext {
  AuthController get auth => AuthScope.of(this);
}
