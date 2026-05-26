import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'screens/splash_screen.dart';
import 'theme/app_theme.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  // Portrait + landscape supported
  SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
    DeviceOrientation.landscapeLeft,
    DeviceOrientation.landscapeRight,
  ]);

  // Transparent status bar — app bar color shows through
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.light,
    statusBarBrightness: Brightness.dark,
  ));

  runApp(const EDITHApp());
}

class EDITHApp extends StatelessWidget {
  const EDITHApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'EDITH',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      // Keyboard insets handled per-screen
      home: const SplashScreen(),
    );
  }
}
