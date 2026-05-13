import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../theme/app_theme.dart';
import '../widgets/robot_logo.dart';
import 'home_screen.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with TickerProviderStateMixin {

  // ── Controllers ───────────────────────────────────────────
  late final AnimationController _bgCtrl;      // background wave expand
  late final AnimationController _logoCtrl;    // logo pop-in
  late final AnimationController _textCtrl;    // text + tagline fade up
  late final AnimationController _progressCtrl;// progress bar fill
  late final AnimationController _pulseCtrl;   // logo continuous pulse
  late final AnimationController _ringCtrl;    // rotating ring
  late final AnimationController _exitCtrl;    // exit slide up

  // ── Animations ────────────────────────────────────────────
  late final Animation<double> _bgScale;
  late final Animation<double> _bgOpacity;
  late final Animation<double> _logoScale;
  late final Animation<double> _logoOpacity;
  late final Animation<Offset>  _textSlide;
  late final Animation<double> _textOpacity;
  late final Animation<double> _progress;
  late final Animation<double> _pulse;
  late final Animation<double> _ring;
  late final Animation<Offset>  _exitSlide;
  late final Animation<double> _exitOpacity;

  @override
  void initState() {
    super.initState();

    // White status bar for white splash
    SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
    ));

    // ── Background circle expand ─────────────────────────
    _bgCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    );
    _bgScale = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _bgCtrl, curve: Curves.easeOutCubic),
    );
    _bgOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _bgCtrl,
          curve: const Interval(0.0, 0.4, curve: Curves.easeOut)),
    );

    // ── Logo pop-in ──────────────────────────────────────
    _logoCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 700),
    );
    _logoScale = Tween<double>(begin: 0.4, end: 1.0).animate(
      CurvedAnimation(parent: _logoCtrl,
          curve: Curves.elasticOut),
    );
    _logoOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _logoCtrl,
          curve: const Interval(0.0, 0.5, curve: Curves.easeOut)),
    );

    // ── Text fade + slide up ─────────────────────────────
    _textCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );
    _textSlide = Tween<Offset>(
      begin: const Offset(0, 0.4),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _textCtrl, curve: Curves.easeOutCubic));
    _textOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _textCtrl, curve: Curves.easeOut),
    );

    // ── Progress bar ─────────────────────────────────────
    _progressCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2400),
    );
    _progress = CurvedAnimation(
      parent: _progressCtrl,
      curve: Curves.easeInOut,
    );

    // ── Logo continuous pulse ────────────────────────────
    _pulseCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1800),
    )..repeat(reverse: true);
    _pulse = Tween<double>(begin: 1.0, end: 1.06).animate(
      CurvedAnimation(parent: _pulseCtrl, curve: Curves.easeInOut),
    );

    // ── Rotating ring ────────────────────────────────────
    _ringCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 3000),
    )..repeat();
    _ring = Tween<double>(begin: 0.0, end: 2 * math.pi).animate(
      CurvedAnimation(parent: _ringCtrl, curve: Curves.linear),
    );

    // ── Exit slide up ────────────────────────────────────
    _exitCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 500),
    );
    _exitSlide = Tween<Offset>(
      begin: Offset.zero,
      end: const Offset(0, -1.0),
    ).animate(CurvedAnimation(parent: _exitCtrl, curve: Curves.easeInCubic));
    _exitOpacity = Tween<double>(begin: 1.0, end: 0.0).animate(
      CurvedAnimation(parent: _exitCtrl,
          curve: const Interval(0.4, 1.0, curve: Curves.easeIn)),
    );

    _runSequence();
  }

  Future<void> _runSequence() async {
    // 1. Background expands
    _bgCtrl.forward();
    await Future.delayed(const Duration(milliseconds: 300));

    // 2. Logo pops in
    _logoCtrl.forward();
    await Future.delayed(const Duration(milliseconds: 400));

    // 3. Text slides up
    _textCtrl.forward();
    await Future.delayed(const Duration(milliseconds: 200));

    // 4. Progress bar fills
    _progressCtrl.forward();

    // 5. Wait for total splash time
    await Future.delayed(const Duration(milliseconds: 2800));
    if (!mounted) return;

    // 6. Exit animation
    await _exitCtrl.forward();
    if (!mounted) return;

    // 7. Navigate
    Navigator.of(context).pushReplacement(
      PageRouteBuilder(
        pageBuilder: (_, __, ___) => const HomeScreen(),
        transitionsBuilder: (_, anim, __, child) => FadeTransition(
          opacity: anim,
          child: child,
        ),
        transitionDuration: const Duration(milliseconds: 300),
      ),
    );
  }

  @override
  void dispose() {
    _bgCtrl.dispose();
    _logoCtrl.dispose();
    _textCtrl.dispose();
    _progressCtrl.dispose();
    _pulseCtrl.dispose();
    _ringCtrl.dispose();
    _exitCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;

    return Scaffold(
      backgroundColor: Colors.white,
      body: SlideTransition(
        position: _exitSlide,
        child: FadeTransition(
          opacity: _exitOpacity,
          child: Stack(
            children: [

              // ── Decorative blue circles (background) ──────
              _BackgroundCircles(
                scaleAnim: _bgScale,
                opacityAnim: _bgOpacity,
                screenSize: size,
              ),

              // ── Main content ───────────────────────────────
              SafeArea(
                child: Column(
                  children: [
                    const Spacer(flex: 3),

                    // Logo area
                    _LogoSection(
                      scaleAnim: _logoScale,
                      opacityAnim: _logoOpacity,
                      pulseAnim: _pulse,
                      ringAnim: _ring,
                    ),

                    const SizedBox(height: 32),

                    // Text
                    _TextSection(
                      slideAnim: _textSlide,
                      opacityAnim: _textOpacity,
                    ),

                    const Spacer(flex: 3),

                    // Progress
                    _ProgressSection(progressAnim: _progress),

                    const SizedBox(height: 40),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Background decorative circles ────────────────────────────

class _BackgroundCircles extends StatelessWidget {
  final Animation<double> scaleAnim;
  final Animation<double> opacityAnim;
  final Size screenSize;

  const _BackgroundCircles({
    required this.scaleAnim,
    required this.opacityAnim,
    required this.screenSize,
  });

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: scaleAnim,
      builder: (_, __) {
        return Stack(
          children: [
            // Large circle — top right
            Positioned(
              top: -screenSize.width * 0.35,
              right: -screenSize.width * 0.25,
              child: Opacity(
                opacity: opacityAnim.value * 0.12,
                child: Transform.scale(
                  scale: scaleAnim.value,
                  child: Container(
                    width: screenSize.width * 0.9,
                    height: screenSize.width * 0.9,
                    decoration: const BoxDecoration(
                      color: AppColors.blue,
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
              ),
            ),
            // Medium circle — bottom left
            Positioned(
              bottom: -screenSize.width * 0.3,
              left: -screenSize.width * 0.2,
              child: Opacity(
                opacity: opacityAnim.value * 0.08,
                child: Transform.scale(
                  scale: scaleAnim.value,
                  child: Container(
                    width: screenSize.width * 0.75,
                    height: screenSize.width * 0.75,
                    decoration: const BoxDecoration(
                      color: AppColors.blue,
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
              ),
            ),
            // Small accent circle — top left
            Positioned(
              top: screenSize.height * 0.12,
              left: -screenSize.width * 0.08,
              child: Opacity(
                opacity: opacityAnim.value * 0.06,
                child: Transform.scale(
                  scale: scaleAnim.value,
                  child: Container(
                    width: screenSize.width * 0.4,
                    height: screenSize.width * 0.4,
                    decoration: BoxDecoration(
                      color: AppColors.blueXLight,
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
              ),
            ),
            // Tiny dot — bottom right
            Positioned(
              bottom: screenSize.height * 0.18,
              right: screenSize.width * 0.08,
              child: Opacity(
                opacity: opacityAnim.value * 0.15,
                child: Transform.scale(
                  scale: scaleAnim.value,
                  child: Container(
                    width: screenSize.width * 0.12,
                    height: screenSize.width * 0.12,
                    decoration: BoxDecoration(
                      color: AppColors.blueLight,
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}

// ── Logo section ──────────────────────────────────────────────

class _LogoSection extends StatelessWidget {
  final Animation<double> scaleAnim;
  final Animation<double> opacityAnim;
  final Animation<double> pulseAnim;
  final Animation<double> ringAnim;

  const _LogoSection({
    required this.scaleAnim,
    required this.opacityAnim,
    required this.pulseAnim,
    required this.ringAnim,
  });

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: Listenable.merge([scaleAnim, pulseAnim, ringAnim]),
      builder: (_, __) {
        return Opacity(
          opacity: opacityAnim.value.clamp(0.0, 1.0),
          child: Transform.scale(
            scale: scaleAnim.value * pulseAnim.value,
            child: SizedBox(
              width: 160,
              height: 160,
              child: Stack(
                alignment: Alignment.center,
                children: [

                  // Outer glow ring (static)
                  Container(
                    width: 152,
                    height: 152,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: AppColors.blue.withOpacity(0.1),
                        width: 1.5,
                      ),
                    ),
                  ),

                  // Rotating dashed ring
                  Transform.rotate(
                    angle: ringAnim.value,
                    child: CustomPaint(
                      size: const Size(140, 140),
                      painter: _DashedRingPainter(
                        color: AppColors.blue.withOpacity(0.25),
                        strokeWidth: 2,
                        dashCount: 12,
                      ),
                    ),
                  ),

                  // Inner soft glow
                  Container(
                    width: 110,
                    height: 110,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppColors.blue.withOpacity(0.06),
                    ),
                  ),

                  // Logo box — Option 6 is self-contained, no wrapper bg needed
                  Container(
                    width: 92,
                    height: 92,
                    decoration: const BoxDecoration(
                      color: Colors.transparent,
                      shape: BoxShape.circle,
                    ),
                    child: const RobotLogo(size: 92, showBackground: false),
                  ),

                  // Orbiting dot
                  Transform.rotate(
                    angle: ringAnim.value * 1.5,
                    child: Transform.translate(
                      offset: const Offset(68, 0),
                      child: Container(
                        width: 10,
                        height: 10,
                        decoration: BoxDecoration(
                          color: AppColors.blue,
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.blue.withOpacity(0.5),
                              blurRadius: 6,
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),

                  // Second orbiting dot (opposite direction, smaller)
                  Transform.rotate(
                    angle: -ringAnim.value * 0.8 + math.pi,
                    child: Transform.translate(
                      offset: const Offset(58, 0),
                      child: Container(
                        width: 6,
                        height: 6,
                        decoration: BoxDecoration(
                          color: AppColors.blueXLight,
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.blueXLight.withOpacity(0.5),
                              blurRadius: 4,
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

// ── Text section ──────────────────────────────────────────────

class _TextSection extends StatelessWidget {
  final Animation<Offset> slideAnim;
  final Animation<double> opacityAnim;

  const _TextSection({
    required this.slideAnim,
    required this.opacityAnim,
  });

  @override
  Widget build(BuildContext context) {
    return SlideTransition(
      position: slideAnim,
      child: FadeTransition(
        opacity: opacityAnim,
        child: Column(
          children: [
            // App name
            ShaderMask(
              shaderCallback: (bounds) => LinearGradient(
                colors: [AppColors.blue, AppColors.blueXLight],
                begin: Alignment.centerLeft,
                end: Alignment.centerRight,
              ).createShader(bounds),
              child: const Text(
                'EDITH',
                style: TextStyle(
                  fontSize: 38,
                  fontWeight: FontWeight.w800,
                  color: Colors.white, // masked by shader
                  letterSpacing: 6,
                ),
              ),
            ),
            const SizedBox(height: 8),
            // Tagline
            Text(
              'Your Private AI Assistant',
              style: TextStyle(
                fontSize: 14,
                color: AppColors.blue.withOpacity(0.55),
                letterSpacing: 0.5,
                fontWeight: FontWeight.w400,
              ),
            ),
            const SizedBox(height: 16),
            // Pill badge
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
              decoration: BoxDecoration(
                color: AppColors.blueBg,
                borderRadius: BorderRadius.circular(99),
                border: Border.all(color: AppColors.blueBorder),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 6,
                    height: 6,
                    decoration: const BoxDecoration(
                      color: AppColors.green,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    'On-device · Private',
                    style: TextStyle(
                      fontSize: 11.5,
                      color: AppColors.blue.withOpacity(0.7),
                      fontWeight: FontWeight.w500,
                      letterSpacing: 0.3,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Progress section ──────────────────────────────────────────

class _ProgressSection extends StatefulWidget {
  final Animation<double> progressAnim;
  const _ProgressSection({required this.progressAnim});

  @override
  State<_ProgressSection> createState() => _ProgressSectionState();
}

class _ProgressSectionState extends State<_ProgressSection> {
  static const _steps = [
    'Initializing...',
    'Loading models...',
    'Preparing workspace...',
    'Almost ready...',
  ];
  int _stepIdx = 0;

  @override
  void initState() {
    super.initState();
    _cycleSteps();
  }

  Future<void> _cycleSteps() async {
    for (var i = 1; i < _steps.length; i++) {
      await Future.delayed(const Duration(milliseconds: 650));
      if (!mounted) return;
      setState(() => _stepIdx = i);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 48),
      child: Column(
        children: [
          // Step label with animated switch
          AnimatedSwitcher(
            duration: const Duration(milliseconds: 300),
            transitionBuilder: (child, anim) => FadeTransition(
              opacity: anim,
              child: SlideTransition(
                position: Tween<Offset>(
                  begin: const Offset(0, 0.3),
                  end: Offset.zero,
                ).animate(anim),
                child: child,
              ),
            ),
            child: Text(
              _steps[_stepIdx],
              key: ValueKey(_stepIdx),
              style: TextStyle(
                fontSize: 12,
                color: AppColors.blue.withOpacity(0.45),
                letterSpacing: 0.3,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          const SizedBox(height: 12),

          // Progress bar
          AnimatedBuilder(
            animation: widget.progressAnim,
            builder: (_, __) {
              return Column(
                children: [
                  // Track
                  Container(
                    height: 4,
                    decoration: BoxDecoration(
                      color: AppColors.blueBg,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: Stack(
                        children: [
                          // Fill
                          FractionallySizedBox(
                            widthFactor: widget.progressAnim.value,
                            child: Container(
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  colors: [
                                    AppColors.blue,
                                    AppColors.blueXLight,
                                  ],
                                ),
                                borderRadius: BorderRadius.circular(4),
                              ),
                            ),
                          ),
                          // Shimmer overlay
                          if (widget.progressAnim.value > 0.05)
                            FractionallySizedBox(
                              widthFactor: widget.progressAnim.value,
                              child: Container(
                                decoration: BoxDecoration(
                                  gradient: LinearGradient(
                                    colors: [
                                      Colors.transparent,
                                      Colors.white.withOpacity(0.3),
                                      Colors.transparent,
                                    ],
                                    stops: const [0.0, 0.5, 1.0],
                                  ),
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  // Percentage
                  Align(
                    alignment: Alignment.centerRight,
                    child: Text(
                      '${(widget.progressAnim.value * 100).toInt()}%',
                      style: TextStyle(
                        fontSize: 11,
                        color: AppColors.blue.withOpacity(0.4),
                        fontWeight: FontWeight.w600,
                        fontFeatures: const [FontFeature.tabularFigures()],
                      ),
                    ),
                  ),
                ],
              );
            },
          ),
        ],
      ),
    );
  }
}

// ── Dashed ring painter ───────────────────────────────────────

class _DashedRingPainter extends CustomPainter {
  final Color color;
  final double strokeWidth;
  final int dashCount;

  const _DashedRingPainter({
    required this.color,
    required this.strokeWidth,
    required this.dashCount,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = strokeWidth
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    final center = Offset(size.width / 2, size.height / 2);
    final radius = (size.width / 2) - strokeWidth;
    final dashAngle = (2 * math.pi) / dashCount;
    final gapFraction = 0.45;

    for (int i = 0; i < dashCount; i++) {
      final startAngle = i * dashAngle;
      final sweepAngle = dashAngle * (1 - gapFraction);
      canvas.drawArc(
        Rect.fromCircle(center: center, radius: radius),
        startAngle,
        sweepAngle,
        false,
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _DashedRingPainter old) =>
      old.color != color || old.strokeWidth != strokeWidth;
}
