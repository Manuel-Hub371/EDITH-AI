import 'dart:ui';
import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:provider/provider.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'dart:convert';
import '../providers/auth_provider.dart';
import '../utils/constants.dart';
import '../widgets/glass_card.dart';
import 'package:google_fonts/google_fonts.dart';
import 'chat_screen.dart';
import 'login_screen.dart';
import 'register_screen.dart';

class FaceAuthScreen extends StatefulWidget {
  final bool autoScan;
  FaceAuthScreen({this.autoScan = false});

  @override
  _FaceAuthScreenState createState() => _FaceAuthScreenState();
}

class _FaceAuthScreenState extends State<FaceAuthScreen> with SingleTickerProviderStateMixin {
  CameraController? _controller;
  Future<void>? _initializeControllerFuture;
  bool _isProcessing = false;
  String _statusMessage = "Position your face within the frame";
  late AnimationController _scanController;

  @override
  void initState() {
    super.initState();
    _initializeCamera();
    _scanController = AnimationController(vsync: this, duration: 2.seconds)..repeat(reverse: true);
    
    if (widget.autoScan) {
      Future.delayed(1500.ms, () => _scanFace());
    }
  }

  Future<void> _initializeCamera() async {
    await Permission.camera.request();
    final cameras = await availableCameras();
    CameraDescription? frontCamera;
    try {
      frontCamera = cameras.firstWhere((camera) => camera.lensDirection == CameraLensDirection.front);
    } catch (e) {
      if (cameras.isNotEmpty) frontCamera = cameras.first;
    }

    if (frontCamera != null) {
      _controller = CameraController(frontCamera, ResolutionPreset.medium, enableAudio: false);
      _initializeControllerFuture = _controller!.initialize();
      if (mounted) setState(() {});
    } else {
      setState(() => _statusMessage = "No camera found");
    }
  }

  @override
  void dispose() {
    _controller?.dispose();
    _scanController.dispose();
    super.dispose();
  }

  Future<void> _scanFace() async {
    if (_controller == null || !_controller!.value.isInitialized || _isProcessing) return;

    setState(() {
      _isProcessing = true;
      _statusMessage = "Verifying Identity...";
    });

    try {
      final image = await _controller!.takePicture();
      final bytes = await image.readAsBytes();
      final String faceData = base64Encode(bytes).substring(0, 100); 
      
      final auth = Provider.of<AuthProvider>(context, listen: false);
      
      try {
        await auth.faceLogin(faceData);
        if (mounted) {
          Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => ChatScreen()));
        }
      } catch (e) {
        setState(() => _statusMessage = "Access Denied. Identity not found.");
        _showNewUserDialog(faceData);
      }
    } catch (e) {
      setState(() => _statusMessage = "System Error: $e");
    } finally {
      if (mounted) setState(() => _isProcessing = false);
    }
  }

  void _showNewUserDialog(String faceData) {
    showDialog(
      context: context,
      builder: (ctx) => BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 5, sigmaY: 5),
        child: AlertDialog(
          backgroundColor: AppColors.surface.withOpacity(0.8),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20), side: BorderSide(color: Colors.white10)),
          title: Text("UNRECOGNIZED FACE", style: AppColors.displayLarge.copyWith(fontSize: 18, color: AppColors.accent)),
          content: Text("Proceed with system registration or use fallback credentials?", style: TextStyle(color: Colors.white70)),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.of(ctx).pop();
                Navigator.of(context).push(MaterialPageRoute(builder: (_) => RegisterScreen(faceData: faceData)));
              },
              child: Text("REGISTER", style: TextStyle(color: AppColors.primary)),
            ),
            TextButton(
              onPressed: () {
                Navigator.of(ctx).pop();
                Navigator.of(context).push(MaterialPageRoute(builder: (_) => LoginScreen()));
              },
              child: Text("FALLBACK", style: TextStyle(color: Colors.white54)),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: Stack(
        children: [
          // Background Camera
          if (_controller != null && _controller!.value.isInitialized)
            Positioned.fill(
              child: FittedBox(
                fit: BoxFit.cover,
                child: SizedBox(
                  width: _controller!.value.previewSize!.height,
                  height: _controller!.value.previewSize!.width,
                  child: CameraPreview(_controller!),
                ),
              ),
            )
          else
            Center(child: CircularProgressIndicator(color: AppColors.primary)),

          // Scan Overlay
          Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [AppColors.background.withOpacity(0.6), Colors.transparent, AppColors.background.withOpacity(0.9)],
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
              ),
            ),
          ),

          SafeArea(
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 40),
                  child: Text(
                    "BIOMETRIC ACCESS",
                    style: GoogleFonts.outfit(
                      color: Colors.white,
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 4,
                    ),
                  ).animate().fadeIn().slideY(begin: -0.2, end: 0),
                ),
                
                Spacer(),
                
                // Scanning Frame
                Center(
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      Container(
                        width: 280,
                        height: 380,
                        decoration: BoxDecoration(
                          border: Border.all(color: AppColors.primary.withOpacity(0.3), width: 1),
                          borderRadius: BorderRadius.circular(40),
                        ),
                      ),
                      
                      // Animated Corners
                      ..._buildCorners(),

                      // Scanning Line
                      AnimatedBuilder(
                        animation: _scanController,
                        builder: (context, child) {
                          return Positioned(
                            top: 10 + (360 * _scanController.value),
                            child: Container(
                              width: 260,
                              height: 2,
                              decoration: BoxDecoration(
                                boxShadow: [
                                  BoxShadow(color: AppColors.primary, blurRadius: 15, spreadRadius: 2)
                                ],
                                gradient: LinearGradient(
                                  colors: [Colors.transparent, AppColors.primary, Colors.transparent],
                                )
                              ),
                            ),
                          );
                        },
                      ),
                    ],
                  ),
                ),
                
                SizedBox(height: 40),
                
                Text(
                  _statusMessage,
                  textAlign: TextAlign.center,
                  style: GoogleFonts.poppins(color: Colors.white70, fontSize: 14),
                ).animate(target: _isProcessing ? 1 : 0).shimmer(),

                Spacer(),

                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 20),
                  child: GlassCard(
                    padding: EdgeInsets.zero,
                    borderRadius: 30,
                    child: Material(
                      color: Colors.transparent,
                      child: InkWell(
                        onTap: _scanFace,
                        borderRadius: BorderRadius.circular(30),
                        child: Container(
                          padding: EdgeInsets.symmetric(vertical: 18),
                          width: double.infinity,
                          decoration: BoxDecoration(
                            border: Border.all(color: AppColors.primary.withOpacity(0.2)),
                            borderRadius: BorderRadius.circular(30),
                          ),
                          child: Center(
                            child: _isProcessing 
                                ? SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                : Text("INITIATE SCAN", style: GoogleFonts.outfit(color: Colors.white, fontWeight: FontWeight.bold, letterSpacing: 2)),
                          ),
                        ),
                      ),
                    ),
                  ),
                ).animate().fadeIn(delay: 400.ms).slideY(begin: 0.2, end: 0),

                TextButton(
                  onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => LoginScreen())),
                  child: Text("ACCESS VIA KEY-CODE", style: TextStyle(color: Colors.white38, letterSpacing: 1, fontSize: 12)),
                ),
                
                SizedBox(height: 20),
              ],
            ),
          ),
        ],
      ),
    );
  }

  List<Widget> _buildCorners() {
    return [
      _buildCorner(top: 0, left: 0, angle: 0),
      _buildCorner(top: 0, right: 0, angle: 1.57),
      _buildCorner(bottom: 0, left: 0, angle: -1.57),
      _buildCorner(bottom: 0, right: 0, angle: 3.14),
    ];
  }

  Widget _buildCorner({double? top, double? bottom, double? left, double? right, required double angle}) {
    return Positioned(
      top: top, bottom: bottom, left: left, right: right,
      child: Transform.rotate(
        angle: angle,
        child: Container(
          width: 30,
          height: 30,
          decoration: BoxDecoration(
            border: Border(
              top: BorderSide(color: AppColors.primary, width: 3),
              left: BorderSide(color: AppColors.primary, width: 3),
            ),
          ),
        ),
      ),
    );
  }
}
