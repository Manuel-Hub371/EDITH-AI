import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import 'robot_logo.dart';

/// Blue app bar — EDITH logo + name on left, Online status on right.
/// Used as the PreferredSizeWidget in Scaffold.appBar.
class AppHeader extends StatelessWidget implements PreferredSizeWidget {
  final String title;
  final VoidCallback? onMenuTap;
  final VoidCallback? onMoreTap;

  const AppHeader({
    super.key,
    this.title = 'EDITH',
    this.onMenuTap,
    this.onMoreTap,
  });

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);

  @override
  Widget build(BuildContext context) {
    return AppBar(
      backgroundColor: AppColors.blue,
      elevation: 0,
      scrolledUnderElevation: 0,
      // Left: optional menu + logo + name
      leading: onMenuTap != null
          ? IconButton(
              icon: const Icon(Icons.menu_rounded, color: Colors.white, size: 22),
              onPressed: onMenuTap,
            )
          : null,
      automaticallyImplyLeading: false,
      titleSpacing: onMenuTap != null ? 0 : 16,
      title: Row(
        children: [
          // Option 6 logo — self-contained dark circle, no wrapper needed
          const RobotLogo(size: 32, showBackground: false),
          const SizedBox(width: 10),
          // App name
          const Text(
            'EDITH',
            style: TextStyle(
              color: Colors.white,
              fontSize: 17,
              fontWeight: FontWeight.w700,
              letterSpacing: 2,
            ),
          ),
        ],
      ),
      actions: [
        // Online status pill
        Container(
          margin: const EdgeInsets.only(right: 4),
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.15),
            borderRadius: BorderRadius.circular(99),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              _OnlineDot(),
              const SizedBox(width: 5),
              const Text(
                'Online',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
        if (onMoreTap != null)
          IconButton(
            icon: const Icon(Icons.more_vert_rounded, color: Colors.white, size: 20),
            onPressed: onMoreTap,
          ),
        const SizedBox(width: 4),
      ],
    );
  }
}

/// Pulsing green dot for online status
class _OnlineDot extends StatefulWidget {
  @override
  State<_OnlineDot> createState() => _OnlineDotState();
}

class _OnlineDotState extends State<_OnlineDot>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final Animation<double> _anim;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat(reverse: true);
    _anim = Tween<double>(begin: 0.5, end: 1.0).animate(
      CurvedAnimation(parent: _ctrl, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _anim,
      builder: (_, __) => Opacity(
        opacity: _anim.value,
        child: Container(
          width: 7,
          height: 7,
          decoration: const BoxDecoration(
            color: AppColors.greenLight,
            shape: BoxShape.circle,
          ),
        ),
      ),
    );
  }
}
