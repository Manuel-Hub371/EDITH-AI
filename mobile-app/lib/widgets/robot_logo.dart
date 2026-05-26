// ignore: unused_import
import 'dart:math' as math;
import 'package:flutter/material.dart';

/// EDITH logo — Option 6: Neon Dark Bot
/// Dark circle with radial blue glow, neon cyan eyes, blue ring border.
class RobotLogo extends StatelessWidget {
  final double size;
  final bool showBackground; // kept for API compat
  final bool showText;

  const RobotLogo({
    super.key,
    this.size = 80,
    this.showBackground = true,
    this.showText = false,
  });

  @override
  Widget build(BuildContext context) {
    final logo = SizedBox(
      width: size,
      height: size,
      child: CustomPaint(painter: _NeonBotPainter()),
    );

    if (!showText) return logo;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        logo,
        SizedBox(height: size * 0.1),
        ShaderMask(
          shaderCallback: (bounds) => const LinearGradient(
            colors: [Color(0xFF60A5FA), Color(0xFF2563EB)],
          ).createShader(bounds),
          child: Text(
            'EDITH',
            style: TextStyle(
              fontSize: size * 0.22,
              fontWeight: FontWeight.w800,
              color: Colors.white,
              letterSpacing: 2.5,
            ),
          ),
        ),
      ],
    );
  }
}

typedef RobotLogoWidget = RobotLogo;

class _NeonBotPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final s = size.width;
    final cx = s / 2, cy = s / 2;
    final fill = Paint()..style = PaintingStyle.fill;
    final stroke = Paint()..style = PaintingStyle.stroke;

    // ── Dark circle with radial glow ──────────────────────
    final bgGrad = RadialGradient(
      center: const Alignment(-0.2, -0.3),
      radius: 0.85,
      colors: const [Color(0xFF3B82F6), Color(0xFF0F172A)],
    );
    fill.shader = bgGrad.createShader(
        Rect.fromCircle(center: Offset(cx, cy), radius: s * 0.48));
    canvas.drawCircle(Offset(cx, cy), s * 0.48, fill);
    fill.shader = null;

    // Outer ring glow
    stroke
      ..color = const Color(0xFF3B82F6).withValues(alpha: 0.5)
      ..strokeWidth = s * 0.015;
    canvas.drawCircle(Offset(cx, cy), s * 0.48, stroke);

    // Inner subtle ring
    stroke
      ..color = const Color(0xFF60A5FA).withValues(alpha: 0.2)
      ..strokeWidth = s * 0.01;
    canvas.drawCircle(Offset(cx, cy), s * 0.44, stroke);

    // ── Antenna ───────────────────────────────────────────
    fill.color = const Color(0xFF60A5FA);
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(s * 0.47, s * 0.08, s * 0.06, s * 0.14),
        Radius.circular(s * 0.03),
      ),
      fill,
    );
    fill.color = const Color(0xFF93C5FD);
    canvas.drawCircle(Offset(cx, s * 0.07), s * 0.04, fill);

    // ── Head box ──────────────────────────────────────────
    fill.color = Colors.white.withValues(alpha: 0.06);
    stroke
      ..color = const Color(0xFF60A5FA)
      ..strokeWidth = s * 0.015;
    final headRect = RRect.fromRectAndRadius(
      Rect.fromLTWH(s * 0.20, s * 0.22, s * 0.60, s * 0.44),
      Radius.circular(s * 0.10),
    );
    canvas.drawRRect(headRect, fill);
    canvas.drawRRect(headRect, stroke);

    // ── Ear pieces ────────────────────────────────────────
    fill.color = const Color(0xFF60A5FA).withValues(alpha: 0.3);
    stroke
      ..color = const Color(0xFF60A5FA)
      ..strokeWidth = s * 0.01;
    final leftEar = RRect.fromRectAndRadius(
      Rect.fromLTWH(s * 0.09, s * 0.32, s * 0.12, s * 0.18),
      Radius.circular(s * 0.05),
    );
    final rightEar = RRect.fromRectAndRadius(
      Rect.fromLTWH(s * 0.79, s * 0.32, s * 0.12, s * 0.18),
      Radius.circular(s * 0.05),
    );
    canvas.drawRRect(leftEar, fill);
    canvas.drawRRect(leftEar, stroke);
    canvas.drawRRect(rightEar, fill);
    canvas.drawRRect(rightEar, stroke);

    // ── Eyes ──────────────────────────────────────────────
    for (final ex in [s * 0.36, s * 0.64]) {
      final ey = s * 0.42;
      // Glow halo
      fill.color = const Color(0xFF00E5FF).withValues(alpha: 0.15);
      canvas.drawCircle(Offset(ex, ey), s * 0.07, fill);
      // Ring
      stroke
        ..color = const Color(0xFF00E5FF)
        ..strokeWidth = s * 0.015;
      canvas.drawCircle(Offset(ex, ey), s * 0.07, stroke);
      // Solid fill
      fill.color = const Color(0xFF00E5FF);
      canvas.drawCircle(Offset(ex, ey), s * 0.035, fill);
    }

    // ── Smile ─────────────────────────────────────────────
    final smilePaint = Paint()
      ..color = const Color(0xFF60A5FA)
      ..style = PaintingStyle.stroke
      ..strokeWidth = s * 0.02
      ..strokeCap = StrokeCap.round;
    final smilePath = Path()
      ..moveTo(s * 0.33, s * 0.55)
      ..quadraticBezierTo(cx, s * 0.65, s * 0.67, s * 0.55);
    canvas.drawPath(smilePath, smilePaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
