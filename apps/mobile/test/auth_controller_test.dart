import 'package:blueprint_mobile/auth/auth_controller.dart';
import 'package:blueprint_mobile/auth/auth_service.dart';
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';

class _MemorySecureStorage extends FlutterSecureStorage {
  final Map<String, String?> _store = {};

  @override
  Future<void> write({required String key, String? value, IOSOptions? iOptions, AndroidOptions? aOptions, LinuxOptions? lOptions, MacOsOptions? mOptions, WindowsOptions? wOptions}) async {
    _store[key] = value;
  }

  @override
  Future<String?> read({required String key, IOSOptions? iOptions, AndroidOptions? aOptions, LinuxOptions? lOptions, MacOsOptions? mOptions, WindowsOptions? wOptions}) async {
    return _store[key];
  }

  @override
  Future<void> delete({required String key, IOSOptions? iOptions, AndroidOptions? aOptions, LinuxOptions? lOptions, MacOsOptions? mOptions, WindowsOptions? wOptions}) async {
    _store.remove(key);
  }
}

class _FakeAuthService extends AuthService {
  _FakeAuthService() : super(client: Dio(), storage: _MemorySecureStorage());

  AuthSession? storedSession;
  AuthException? loginError;
  AuthException? registerError;

  @override
  Future<AuthSession> login({required String email, required String password}) async {
    if (loginError != null) throw loginError!;
    final session = AuthSession(
      user: AuthUser(id: '1', email: email),
      accessToken: 'token',
    );
    storedSession = session;
    return session;
  }

  @override
  Future<AuthSession> register({required String email, required String password, String? name}) async {
    if (registerError != null) throw registerError!;
    final session = AuthSession(
      user: AuthUser(id: '2', email: email, name: name),
      accessToken: 'token',
    );
    storedSession = session;
    return session;
  }

  @override
  Future<AuthSession?> restoreSession() async => storedSession;

  @override
  Future<void> clearSession() async {
    storedSession = null;
  }
}

void main() {
  group('AuthController', () {
    late _FakeAuthService service;
    late AuthController controller;

    setUp(() {
      service = _FakeAuthService();
      controller = AuthController(service);
    });

    test('restoreSession sets unauthenticated when no session stored', () async {
      await controller.restoreSession();
      expect(controller.state.status, AuthStatus.unauthenticated);
    });

    test('login success updates state to authenticated', () async {
      await controller.login('user@example.com', 'password');
      expect(controller.state.status, AuthStatus.authenticated);
      expect(controller.state.user?.email, 'user@example.com');
    });

    test('login failure exposes error message', () async {
      service.loginError = AuthException('Invalid credentials', 401);
      await controller.login('bad@example.com', 'wrong');
      expect(controller.state.status, AuthStatus.error);
      expect(controller.state.errorMessage, 'Invalid credentials');
    });

    test('register success updates state to authenticated', () async {
      await controller.register('new@example.com', 'password', name: 'New');
      expect(controller.state.status, AuthStatus.authenticated);
      expect(controller.state.user?.name, 'New');
    });

    test('logout clears session and sets unauthenticated', () async {
      await controller.login('user@example.com', 'password');
      await controller.logout();
      expect(controller.state.status, AuthStatus.unauthenticated);
      expect(service.storedSession, isNull);
    });
  });
}
