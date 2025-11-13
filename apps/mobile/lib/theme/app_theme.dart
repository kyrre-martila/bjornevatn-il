import 'package:flutter/material.dart';
import 'app_tokens.dart';

class AppTheme {
  static ThemeData get light {
    final colorScheme = ColorScheme(
      brightness: Brightness.light,
      primary: AppColors.primary,
      onPrimary: Colors.white,
      secondary: AppColors.secondary,
      onSecondary: Colors.white,
      error: Colors.red,
      onError: Colors.white,
      background: AppColors.neutral,
      onBackground: AppColors.base,
      surface: AppColors.neutralSoft,
      onSurface: AppColors.base,
    );

    final baseTextTheme = Typography.material2021().black.apply(
      bodyColor: AppColors.base,
      displayColor: AppColors.base,
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: colorScheme.background,
      textTheme: baseTextTheme.copyWith(
        bodySmall: baseTextTheme.bodySmall?.copyWith(fontSize: 12),
        bodyMedium: baseTextTheme.bodyMedium?.copyWith(fontSize: 14),
        bodyLarge: baseTextTheme.bodyLarge?.copyWith(fontSize: 16),
        titleMedium: baseTextTheme.titleMedium?.copyWith(fontSize: 18),
        titleLarge: baseTextTheme.titleLarge?.copyWith(fontSize: 22),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: colorScheme.surface,
        foregroundColor: colorScheme.onSurface,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: baseTextTheme.titleMedium?.copyWith(
          fontWeight: FontWeight.w600,
          color: colorScheme.onSurface,
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.neutral0,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.m),
          borderSide: const BorderSide(color: AppColors.neutral200),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.m),
          borderSide: const BorderSide(color: AppColors.neutral200),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.m),
          borderSide: const BorderSide(color: AppColors.primary, width: 2),
        ),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.m,
          vertical: AppSpacing.s,
        ),
      ),
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: colorScheme.surface,
        selectedItemColor: colorScheme.primary,
        unselectedItemColor: AppColors.baseMuted,
        selectedIconTheme: const IconThemeData(size: 22),
        unselectedIconTheme: const IconThemeData(size: 20),
        type: BottomNavigationBarType.fixed,
      ),
      cardTheme: CardTheme(
        color: colorScheme.surface,
        margin: const EdgeInsets.all(0),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.m),
        ),
        elevation: 1,
      ),
    );
  }
}
