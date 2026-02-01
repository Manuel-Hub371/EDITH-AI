import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'providers/auth_provider.dart';
import 'providers/chat_provider.dart';
import 'providers/chat_provider.dart';
import 'screens/login_screen.dart';
import 'screens/chat_screen.dart';
import 'screens/splash_screen.dart';

void main() {
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => ChatProvider()),
        ChangeNotifierProvider(create: (_) => ChatProvider()),
      ],
      child: Consumer<AuthProvider>(
        builder: (ctx, auth, _) => MaterialApp(
          title: 'EDITH AI',
          debugShowCheckedModeBanner: false,
          themeMode: auth.isDarkMode ? ThemeMode.dark : ThemeMode.light,
          theme: ThemeData(
             brightness: Brightness.light,
             primaryColor: Color(0xFF00E5FF),
             // ... Add light theme config if needed, but for now we focus on Dark/Light toggle structure
             // Using a minimal light theme fallback for contrast
             scaffoldBackgroundColor: Colors.white,
             colorScheme: ColorScheme.light(primary: Color(0xFF00E5FF), secondary: Color(0xFF7000FF)),
             textTheme: GoogleFonts.poppinsTextTheme(ThemeData.light().textTheme),
          ),
          darkTheme: ThemeData(
            brightness: Brightness.dark,
            scaffoldBackgroundColor: Color(0xFF0F0F12),
            primaryColor: Color(0xFF00E5FF),
            colorScheme: ColorScheme.dark(
              primary: Color(0xFF00E5FF),
              secondary: Color(0xFF7000FF),
              surface: Color(0xFF1A1A1D),
              background: Color(0xFF0F0F12),
            ),
            cardTheme: CardThemeData(
              color: Color(0xFF1A1A1D),
              elevation: 0,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            ),
            appBarTheme: AppBarTheme(
              backgroundColor: Colors.transparent,
              elevation: 0,
              centerTitle: true,
              titleTextStyle: GoogleFonts.outfit(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
            inputDecorationTheme: InputDecorationTheme(
              filled: true,
              fillColor: Colors.white.withOpacity(0.05),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(15),
                borderSide: BorderSide.none,
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(15),
                borderSide: BorderSide(color: Color(0xFF00E5FF), width: 1.5),
              ),
              contentPadding: EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            ),
            textTheme: GoogleFonts.poppinsTextTheme(ThemeData.dark().textTheme).copyWith(
              displayLarge: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: Colors.white),
              titleLarge: GoogleFonts.outfit(fontWeight: FontWeight.w600, color: Colors.white),
            ),
          ),
          home: SplashScreen(),
        ),
      ),
    );
  }
}

class AuthWrapper extends StatefulWidget {
  @override
  _AuthWrapperState createState() => _AuthWrapperState();
}

class _AuthWrapperState extends State<AuthWrapper> {
  @override
  void initState() {
    super.initState();
    _checkLogin();
  }

  void _checkLogin() async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final success = await auth.tryAutoLogin();
    if (success) {
      if (mounted) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => ChatScreen()),
        );
      }
    } else {
        // Stay on Login (which is what we return below, but wrapped)
        // Actually, if we are here, we are showing the Loading indicator or LoginScreen.
        // Let's handle state better:
        setState(() {
            _isChecking = false;
        });
    }
  }

  bool _isChecking = true;

  @override
  Widget build(BuildContext context) {
    if (_isChecking) {
        return Scaffold(
            backgroundColor: Colors.black,
            body: Center(child: CircularProgressIndicator(color: Colors.cyan)),
        );
    }
    return LoginScreen();
  }
}
