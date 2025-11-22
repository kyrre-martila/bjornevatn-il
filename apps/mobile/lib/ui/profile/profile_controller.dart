import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

class ProfileController extends ChangeNotifier {
  ProfileController({required this.apiBase, required this.accessToken});

  final String apiBase;
  final String? accessToken;

  Map<String, dynamic>? user;
  bool loading = false;
  String? error;

  Future<void> load() async {
    loading = true;
    error = null;
    notifyListeners();

    try {
      final url = Uri.parse('$apiBase/me');
      final res = await http.get(
        url,
        headers: {
          if (accessToken != null) 'Authorization': 'Bearer $accessToken',
        },
      );

      if (res.statusCode != 200) {
        error = 'Failed to load profile';
        loading = false;
        notifyListeners();
        return;
      }

      final data = jsonDecode(res.body);
      user = data['user'];
    } catch (e) {
      error = 'Network error';
    }

    loading = false;
    notifyListeners();
  }

  Future<void> updateField(String key, String value) async {
    try {
      final url = Uri.parse('$apiBase/me');
      final res = await http.patch(
        url,
        headers: {
          'Content-Type': 'application/json',
          if (accessToken != null) 'Authorization': 'Bearer $accessToken',
        },
        body: jsonEncode({key: value}),
      );

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        user = data['user'];
        notifyListeners();
      }
    } catch (_) {
      error = 'Failed to save';
      notifyListeners();
    }
  }

  String get derivedName {
    final u = user;
    if (u == null) return '';
    final first = u['firstName'];
    final last = u['lastName'];
    if (first != null && last != null && first != '' && last != '') {
      return '$first $last';
    }
    return u['email'] ?? '';
  }

  String get initials {
    final u = user;
    if (u == null) return '?';
    final first = u['firstName'];
    final last = u['lastName'];
    if (first != null && last != null && first != '' && last != '') {
      return (first[0] + last[0]).toUpperCase();
    }
    final email = u['email'] ?? '';
    return email.isNotEmpty ? email[0].toUpperCase() : '?';
  }
}
