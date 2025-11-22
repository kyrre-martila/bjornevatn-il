import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'profile_controller.dart';
import 'profile_field.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key, required this.apiBase, required this.token});

  final String apiBase;
  final String? token;

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => ProfileController(apiBase: apiBase, accessToken: token)
        ..load(),
      child: const _ProfileView(),
    );
  }
}

class _ProfileView extends StatelessWidget {
  const _ProfileView();

  @override
  Widget build(BuildContext context) {
    final c = context.watch<ProfileController>();
    final theme = Theme.of(context).textTheme;

    if (c.loading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (c.error != null) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(c.error!),
            const SizedBox(height: 12),
            ElevatedButton(
              onPressed: () => c.load(),
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    final user = c.user;
    if (user == null) {
      return Center(
        child: ElevatedButton(
          onPressed: () => c.load(),
          child: const Text('Retry'),
        ),
      );
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Center(
          child: Column(
            children: [
              CircleAvatar(
                radius: 36,
                child: Text(c.initials, style: const TextStyle(fontSize: 28)),
              ),
              const SizedBox(height: 12),
              Text(
                c.derivedName,
                style: theme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
              ),
              if (user['email'] != null) ...[
                const SizedBox(height: 4),
                Text(
                  user['email'],
                  style: theme.bodySmall?.copyWith(color: Colors.black54),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 24),
        ProfileField(
          label: 'First name',
          value: user['firstName'],
          onSubmit: (v) => c.updateField('firstName', v),
        ),
        ProfileField(
          label: 'Last name',
          value: user['lastName'],
          onSubmit: (v) => c.updateField('lastName', v),
        ),
        ProfileField(
          label: 'Phone',
          value: user['phone'],
          onSubmit: (v) => c.updateField('phone', v),
        ),
        ProfileField(
          label: 'Birth date',
          value: user['birthDate'],
          onSubmit: (v) => c.updateField('birthDate', v),
        ),
      ],
    );
  }
}
