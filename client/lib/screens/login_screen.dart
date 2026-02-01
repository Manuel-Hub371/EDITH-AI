import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../providers/auth_provider.dart';
import '../utils/constants.dart';
import '../widgets/glass_card.dart';
import 'register_screen.dart';


import 'chat_screen.dart';

class LoginScreen extends StatefulWidget {
  @override
  _LoginScreenState createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  void _submit() async {
    if (_formKey.currentState!.validate()) {
      try {
        await Provider.of<AuthProvider>(context, listen: false).login(
          _emailController.text,
          _passwordController.text,
        );
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => ChatScreen()),
        );
      } catch (error) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AppColors.accent,
            content: Text('Login Failed: ${error.toString()}', style: TextStyle(color: Colors.white)),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: Stack(
        children: [
          // Background accents
          Positioned(
            bottom: -50,
            left: -50,
            child: Container(
              width: 250,
              height: 250,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.secondary.withOpacity(0.05),
              ),
            ),
          ),

          Center(
            child: SingleChildScrollView(
              padding: EdgeInsets.all(24),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // App Branding
                  Icon(Icons.blur_on, color: AppColors.primary, size: 80).animate().scale(duration: 600.ms, curve: Curves.elasticOut),
                  SizedBox(height: 20),
                  Text(
                    'EDITH',
                    style: GoogleFonts.outfit(
                      fontSize: 42,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 8,
                      color: Colors.white,
                    ),
                  ).animate().fadeIn(delay: 200.ms).slideY(begin: 0.2, end: 0),
                  
                  SizedBox(height: 48),

                  Form(
                    key: _formKey,
                    child: Column(
                      children: [
                        GlassCard(
                          padding: EdgeInsets.zero,
                          borderRadius: 20,
                          child: TextFormField(
                            controller: _emailController,
                            style: TextStyle(color: Colors.white),
                            decoration: InputDecoration(
                              hintText: 'Neural ID / Email',
                              prefixIcon: Icon(Icons.alternate_email_rounded, color: Colors.white38, size: 20),
                            ),
                            validator: (v) => v!.isEmpty ? 'ID required' : null,
                          ),
                        ).animate().fadeIn(delay: 400.ms).slideX(),
                        
                        SizedBox(height: 16),
                        
                        GlassCard(
                          padding: EdgeInsets.zero,
                          borderRadius: 20,
                          child: TextFormField(
                            controller: _passwordController,
                            obscureText: true,
                            style: TextStyle(color: Colors.white),
                            decoration: InputDecoration(
                              hintText: 'Access Key',
                              prefixIcon: Icon(Icons.lock_person_rounded, color: Colors.white38, size: 20),
                            ),
                            validator: (v) => v!.isEmpty ? 'Key required' : null,
                          ),
                        ).animate().fadeIn(delay: 500.ms).slideX(),
                        
                        SizedBox(height: 32),
                        
                        Consumer<AuthProvider>(
                          builder: (ctx, auth, _) => auth.isLoading
                              ? CircularProgressIndicator(color: AppColors.primary)
                              : Container(
                                  width: double.infinity,
                                  height: 55,
                                  decoration: BoxDecoration(
                                    gradient: AppColors.primaryGradient,
                                    borderRadius: BorderRadius.circular(15),
                                    boxShadow: [
                                      BoxShadow(color: AppColors.primary.withOpacity(0.3), blurRadius: 15, offset: Offset(0, 5))
                                    ],
                                  ),
                                  child: ElevatedButton(
                                    onPressed: _submit,
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: Colors.transparent,
                                      shadowColor: Colors.transparent,
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
                                    ),
                                    child: Text('AUTHORIZE', style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.bold, letterSpacing: 2, color: Colors.black87)),
                                  ),
                                ),
                        ).animate().fadeIn(delay: 600.ms).scale(),
                      ],
                    ),
                  ),
                  
                  SizedBox(height: 24),
                  
                  TextButton(
                    onPressed: () {
                      Navigator.of(context).push(MaterialPageRoute(builder: (_) => RegisterScreen()));
                    },
                    child: Text('Initialize New Core Account', style: GoogleFonts.poppins(color: Colors.white38, fontSize: 13)),
                  ).animate().fadeIn(delay: 800.ms),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
