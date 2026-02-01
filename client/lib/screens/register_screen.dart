import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../providers/auth_provider.dart';
import '../utils/constants.dart';
import '../widgets/glass_card.dart';


import 'chat_screen.dart';

class RegisterScreen extends StatefulWidget {
  final String? faceData;

  const RegisterScreen({Key? key, this.faceData}) : super(key: key);

  @override
  _RegisterScreenState createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _usernameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  void _submit() async {
    if (_formKey.currentState!.validate()) {
      try {
        await Provider.of<AuthProvider>(context, listen: false).register(
          _usernameController.text,
          _emailController.text,
          _passwordController.text,
          faceData: widget.faceData,
        );
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => ChatScreen()),
        );
      } catch (error) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AppColors.accent,
            content: Text('Registration Failed: ${error.toString()}', style: TextStyle(color: Colors.white)),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text('NEW CORE INITIALIZATION', style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.bold, letterSpacing: 2)),
      ),
      body: Stack(
        children: [
          Positioned(
            top: -50,
            right: -50,
            child: Container(
              width: 200,
              height: 200,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.primary.withOpacity(0.05),
              ),
            ),
          ),

          Center(
            child: SingleChildScrollView(
              padding: EdgeInsets.all(24),
              child: Form(
                key: _formKey,
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      widget.faceData != null ? 'IDENTITY SECURED' : 'JOIN THE CORE',
                      style: GoogleFonts.outfit(
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 4,
                        color: Colors.white,
                      ),
                    ).animate().fadeIn().slideY(begin: 0.2, end: 0),
                    
                    if (widget.faceData != null)
                      Padding(
                        padding: const EdgeInsets.only(top: 8.0),
                        child: Text(
                          'Biometric signature captured',
                          style: GoogleFonts.poppins(color: Colors.greenAccent, fontSize: 12),
                        ),
                      ).animate().fadeIn(delay: 400.ms),

                    SizedBox(height: 40),

                    GlassCard(
                      padding: EdgeInsets.zero,
                      borderRadius: 20,
                      child: TextFormField(
                        controller: _usernameController,
                        style: TextStyle(color: Colors.white),
                        decoration: InputDecoration(
                          hintText: 'Operative Name',
                          prefixIcon: Icon(Icons.person_outline_rounded, color: Colors.white38, size: 20),
                        ),
                        validator: (v) => v!.isEmpty ? 'Name required' : null,
                      ),
                    ).animate().fadeIn(delay: 500.ms).slideX(),

                    SizedBox(height: 16),

                    GlassCard(
                      padding: EdgeInsets.zero,
                      borderRadius: 20,
                      child: TextFormField(
                        controller: _emailController,
                        style: TextStyle(color: Colors.white),
                        decoration: InputDecoration(
                          hintText: 'Neural Mail (ID)',
                          prefixIcon: Icon(Icons.alternate_email_rounded, color: Colors.white38, size: 20),
                        ),
                        validator: (v) => v!.isEmpty ? 'ID required' : null,
                      ),
                    ).animate().fadeIn(delay: 600.ms).slideX(),

                    SizedBox(height: 16),

                    GlassCard(
                      padding: EdgeInsets.zero,
                      borderRadius: 20,
                      child: TextFormField(
                        controller: _passwordController,
                        obscureText: true,
                        style: TextStyle(color: Colors.white),
                        decoration: InputDecoration(
                          hintText: 'Access Key (Secret)',
                          prefixIcon: Icon(Icons.lock_outline_rounded, color: Colors.white38, size: 20),
                        ),
                        validator: (v) => v!.isEmpty ? 'Key required' : null,
                      ),
                    ).animate().fadeIn(delay: 700.ms).slideX(),

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
                                child: Text('INITIALIZE', style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.bold, letterSpacing: 2, color: Colors.black87)),
                              ),
                            ),
                    ).animate().fadeIn(delay: 800.ms).scale(),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
