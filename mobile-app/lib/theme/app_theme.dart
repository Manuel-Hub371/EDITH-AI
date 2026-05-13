import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

// ── Color tokens ──────────────────────────────────────────────
class AppColors {
  // Blues
  static const Color blue       = Color(0xFF2563EB);
  static const Color blueDark   = Color(0xFF1D4ED8);
  static const Color blueLight  = Color(0xFF3B82F6);
  static const Color blueXLight = Color(0xFF60A5FA);
  static const Color blueBg     = Color(0xFFEFF6FF);
  static const Color blueBorder = Color(0xFFDBEAFE);

  // Surfaces
  static const Color bg         = Color(0xFFF9FAFB);
  static const Color surface    = Color(0xFFFFFFFF);
  static const Color border     = Color(0xFFE5E7EB);
  static const Color borderLight= Color(0xFFF3F4F6);

  // Text
  static const Color text       = Color(0xFF111827);
  static const Color text2      = Color(0xFF374151);
  static const Color text3      = Color(0xFF6B7280);
  static const Color text4      = Color(0xFF9CA3AF);

  // Status
  static const Color green      = Color(0xFF10B981);
  static const Color greenLight = Color(0xFF34D399);
  static const Color red        = Color(0xFFEF4444);
  static const Color redBg      = Color(0xFFFEF2F2);

  // Bubbles
  static const Color userBubble     = Color(0xFF2563EB);
  static const Color userBubbleText = Colors.white;
  static const Color aiBubble       = Color(0xFFF3F4F6);
  static const Color aiBubbleText   = Color(0xFF111827);

  // Dark (splash)
  static const Color dark  = Color(0xFF0D1117);
  static const Color dark2 = Color(0xFF161B22);
}

// ── AppTheme ──────────────────────────────────────────────────
class AppTheme {
  // Legacy aliases so existing code keeps compiling
  static const Color blue       = AppColors.blue;
  static const Color blueHover  = AppColors.blueDark;
  static const Color blueLight  = AppColors.blueLight;
  static const Color blueXLight = AppColors.blueXLight;
  static const Color blueBg     = AppColors.blueBg;
  static const Color blueBorder = AppColors.blueBorder;
  static const Color bg         = AppColors.bg;
  static const Color surface    = AppColors.surface;
  static const Color border     = AppColors.border;
  static const Color borderLight= AppColors.borderLight;
  static const Color text       = AppColors.text;
  static const Color text2      = AppColors.text2;
  static const Color text3      = AppColors.text3;
  static const Color text4      = AppColors.text4;
  static const Color green      = AppColors.green;
  static const Color greenLight = AppColors.greenLight;
  static const Color red        = AppColors.red;
  static const Color redBg      = AppColors.redBg;
  static const Color dark       = AppColors.dark;
  static const Color dark2      = AppColors.dark2;
  static const Color dark3      = Color(0xFF21262D);
  static const Color darkBorder = Color(0x12FFFFFF);
  static const Color darkText   = Color(0xBFFFFFFF);
  static const Color darkText2  = Color(0x66FFFFFF);
  static const Color primaryBlue  = blueXLight;
  static const Color lightBlue    = Color(0xFF90CAF9);
  static const Color teal         = blue;
  static const Color tealDark     = blueHover;
  static const Color onlineGreen  = green;
  static const Color offWhite     = bg;
  static const Color cardWhite    = surface;
  static const Color darkBg       = dark2;
  static const Color darkBgLight  = dark3;
  static const Color darkBgActive = Color(0xFF2D333B);
  static const Color userBubble   = blue;
  static const Color aiBubble     = surface;
  static const Color textOnLight  = text;
  static const Color textOnUser   = surface;
  static const Color subtleGrey   = text3;
  static const Color mutedText    = text3;
  static const Color sidebarText  = darkText;
  static const Color divider      = border;
  static const Color inputBorder  = border;

  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: AppColors.blue,
        brightness: Brightness.light,
        background: AppColors.bg,
        surface: AppColors.surface,
        primary: AppColors.blue,
        secondary: AppColors.green,
      ),
      scaffoldBackgroundColor: AppColors.bg,
      // App bar — blue, white icons/text
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.blue,
        foregroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        systemOverlayStyle: SystemUiOverlayStyle(
          statusBarColor: Colors.transparent,
          statusBarIconBrightness: Brightness.light,
          statusBarBrightness: Brightness.dark,
        ),
        iconTheme: IconThemeData(color: Colors.white),
        actionsIconTheme: IconThemeData(color: Colors.white),
        titleTextStyle: TextStyle(
          color: Colors.white,
          fontSize: 16,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.3,
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.blue,
          foregroundColor: Colors.white,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: const TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: AppColors.dark2,
        contentTextStyle: const TextStyle(color: Colors.white, fontSize: 13),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        behavior: SnackBarBehavior.floating,
        elevation: 0,
      ),
      dividerTheme: const DividerThemeData(
        color: AppColors.border,
        thickness: 1,
        space: 1,
      ),
      inputDecorationTheme: const InputDecorationTheme(
        filled: false,
        border: InputBorder.none,
        enabledBorder: InputBorder.none,
        focusedBorder: InputBorder.none,
        hintStyle: TextStyle(color: AppColors.text4),
        contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      ),
    );
  }
}
