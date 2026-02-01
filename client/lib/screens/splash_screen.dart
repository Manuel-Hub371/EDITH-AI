import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import 'face_auth_screen.dart';
import '../utils/constants.dart';

class SplashScreen extends StatefulWidget {
  @override
  _SplashScreenState createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _navigateToNext();
  }

  _navigateToNext() async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    await auth.loadPreferences();
    
    await Future.delayed(Duration(seconds: 3)); 
    if (!mounted) return;
    
    final target = auth.faceLoginEnabled 
        ? FaceAuthScreen(autoScan: true) 
        : FaceAuthScreen();

    Navigator.of(context).pushReplacement(
      PageRouteBuilder(
        pageBuilder: (_, __, ___) => target,
        transitionsBuilder: (_, a, __, c) => FadeTransition(opacity: a, child: c),
        transitionDuration: Duration(milliseconds: 1000),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: BoxDecoration(
          color: AppColors.background,
        ),
        child: Stack(
          alignment: Alignment.center,
          children: [
            // Background glow
            Container(
              width: 300,
              height: 300,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.primary.withOpacity(0.05),
              ),
            ).animate(onPlay: (controller) => controller.repeat(reverse: true))
             .scale(begin: const Offset(1, 1), end: const Offset(1.5, 1.5), duration: 2.seconds, curve: Curves.easeInOut),

            Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Logo Container
                Container(
                  width: 100,
                  height: 100,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(color: AppColors.primary.withOpacity(0.5), width: 1),
                    gradient: LinearGradient(
                      colors: [AppColors.primary.withOpacity(0.2), Colors.transparent],
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                    ),
                  ),
                  child: Center(
                    child: Icon(
                      Icons.blur_on,
                      color: AppColors.primary,
                      size: 60,
                    ),
                  ),
                ).animate()
                 .scale(duration: 800.ms, curve: Curves.elasticOut)
                 .shimmer(delay: 1.seconds, duration: 1500.ms, color: Colors.white24),
                
                SizedBox(height: 30),
                
                Text(
                  "EDITH",
                  style: GoogleFonts.outfit(
                    fontSize: 48,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 12,
                    color: Colors.white,
                  ),
                ).animate()
                 .fadeIn(duration: 1.seconds)
                 .slideY(begin: 0.3, end: 0, curve: Curves.easeOutCubic),
                
                SizedBox(height: 8),
                
                Text(
                  "ARTIFICIAL INTELLIGENCE",
                  style: GoogleFonts.poppins(
                    fontSize: 12,
                    letterSpacing: 4,
                    color: AppColors.primary.withOpacity(0.7),
                    fontWeight: FontWeight.w500,
                  ),
                ).animate()
                 .fadeIn(delay: 800.ms, duration: 800.ms),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
