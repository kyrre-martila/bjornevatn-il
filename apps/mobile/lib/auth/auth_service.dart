import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

const String kApiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://10.0.2.2:3333',
);

class AuthUser {
  final String id;
  final String email;
  final String? name;

  const AuthUser({required this.id, required this.email, this.name});

  factory AuthUser.fromJson(Map<String, dynamic> json) {
    return AuthUser(
      id: json['id'] as String,
      email: json['email'] as String,
      name: json['name'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {'id': id, 'email': email, 'name': name};
}

class AuthSession {
  final AuthUser user;
  final String accessToken;

  const AuthSession({required this.user, required this.accessToken});

  factory AuthSession.fromJson(Map<String, dynamic> json) {
    return AuthSession(
      user: AuthUser.fromJson(json['user'] as Map<String, dynamic>),
      accessToken: json['accessToken'] as String,
    );
  }

  Map<String, dynamic> toJson() => {
    'user': user.toJson(),
    'accessToken': accessToken,
  };
}

class AuthException implements Exception {
  final String message;
  final int? statusCode;

  AuthException(this.message, [this.statusCode]);

  @override
  String toString() => 'AuthException(\$statusCode): \$message';
}

class AuthService {
  AuthService({Dio? client, FlutterSecureStorage? storage})
    : _client = client ?? Dio(BaseOptions(baseUrl: kApiBaseUrl)),
      _storage = storage ?? const FlutterSecureStorage();

  final Dio _client;
  final FlutterSecureStorage _storage;

  static const _storageKey = 'bp_auth_session';

  Future<AuthSession> login({
    required String email,
    required String password,
  }) async {
    try {
      final response = await _client.post<Map<String, dynamic>>(
        '/auth/login',
        data: {'email': email, 'password': password},
      );
      return _decodeAndPersist(response);
    } on DioException catch (error) {
      throw _mapDioException(error);
    }
  }

  Future<AuthSession> register({
    required String email,
    required String password,
    String? name,
  }) async {
    try {
      final response = await _client.post<Map<String, dynamic>>(
        '/auth/register',
        data: {
          'email': email,
          'password': password,
          if (name != null && name.isNotEmpty) 'name': name,
        },
      );
      return _decodeAndPersist(response);
    } on DioException catch (error) {
      throw _mapDioException(error);
    }
  }

  Future<AuthSession?> restoreSession() async {
    final stored = await _storage.read(key: _storageKey);
    if (stored == null) return null;

    try {
      final decoded = jsonDecode(stored) as Map<String, dynamic>;
      final session = AuthSession.fromJson(decoded);
      final validatedSession = await _validateSession(session);
      if (validatedSession == null) {
        await clearSession();
        return null;
      }
      return validatedSession;
    } on DioException catch (error) {
      if (error.response?.statusCode == 401) {
        await clearSession();
        return null;
      }
      throw _mapDioException(error);
    } catch (_) {
      await clearSession();
      return null;
    }
  }

  Future<void> clearSession() {
    return _storage.delete(key: _storageKey);
  }

  Future<AuthSession> _decodeAndPersist(
    Response<Map<String, dynamic>> response,
  ) async {
    final data = response.data;
    if (response.statusCode == null ||
        response.statusCode! < 200 ||
        response.statusCode! >= 300) {
      throw AuthException(
        _readErrorMessage(data) ?? 'Unexpected response',
        response.statusCode,
      );
    }
    if (data == null) {
      throw AuthException('Empty response from server', response.statusCode);
    }
    try {
      final session = AuthSession.fromJson(data);
      await _persist(session);
      return session;
    } catch (error) {
      throw AuthException('Invalid auth payload: \$error', response.statusCode);
    }
  }

  Future<void> _persist(AuthSession session) async {
    final encoded = jsonEncode(session.toJson());
    await _storage.write(key: _storageKey, value: encoded);
  }

  Future<AuthSession?> _validateSession(AuthSession session) async {
    try {
      final response = await _client.get<Map<String, dynamic>>(
        '/auth/me',
        options: Options(
          headers: {'Authorization': 'Bearer \${session.accessToken}'},
        ),
      );
      final data = response.data;
      if (response.statusCode == 200 && data != null) {
        final userJson = data['user'] as Map<String, dynamic>?;
        final refreshedSession = AuthSession(
          user: userJson != null ? AuthUser.fromJson(userJson) : session.user,
          accessToken: session.accessToken,
        );
        await _persist(refreshedSession);
        return refreshedSession;
      }
      return null;
    } on DioException catch (error) {
      if (error.response?.statusCode == 401) {
        return null;
      }
      throw error;
    }
  }

  AuthException _mapDioException(DioException error) {
    final statusCode = error.response?.statusCode;
    final data = error.response?.data;
    final message =
        _readErrorMessage(data) ??
        error.message ??
        'Something went wrong. Please try again.';
    return AuthException(message, statusCode);
  }

  String? _readErrorMessage(dynamic data) {
    if (data is Map<String, dynamic>) {
      final message = data['message'];
      if (message is String) return message;
      if (message is List) {
        final first = message.firstWhere(
          (element) => element is String,
          orElse: () => null,
        );
        if (first is String) return first;
      }
    }
    if (data is String && data.isNotEmpty) {
      return data;
    }
    return null;
  }
}
