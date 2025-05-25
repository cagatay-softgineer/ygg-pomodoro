import 'package:flutter/material.dart';
import 'package:ygg_pomodoro/constants/default/user.dart';
import 'package:ygg_pomodoro/styles/color_palette.dart';
import 'package:ygg_pomodoro/widgets/chess_points.dart';
import 'package:ygg_pomodoro/widgets/glowing_overlapping_circles.dart';
import 'package:ygg_pomodoro/widgets/glowing_text.dart';

// Import your glowing text widget here if not in same file
// import 'glowing_text.dart';

class TopBar extends StatelessWidget {
  final String imageUrl;
  final String userName;
  final double size;
  final double nameFontSize;
  final int chainPoints;
  final int storePoints;
  final VoidCallback? onChainTap;

  const TopBar({
    super.key,
    required this.imageUrl,
    required this.userName,
    this.size = 75,
    this.nameFontSize = 32,
    required this.chainPoints,
    required this.storePoints,
    this.onChainTap,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        SizedBox(width: 0),
        Column(
          children: [
            GestureDetector(
              onTap: onChainTap ?? () {
                // fallback: can still use Navigator.pushNamed if not provided
                Navigator.pushNamed(context, '/chain_page');
              },
              child: GlowingOverlappingCircles(points: chainPoints),
            ),
          ],
        ),
        SizedBox(width: 30),
        Container(
          child: Column(
            children: [
              ClipOval(
                child: Image.network(
                  imageUrl,
                  width: 75,
                  height: 75,
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) {
                    return Image.network(
                      UserConstants.defaultAvatarUrl,
                      width: 75,
                      height: 75,
                      fit: BoxFit.cover,
                    );
                  },
                ),
              ),

              const SizedBox(height: 20),

              GlowingText(
                text: userName,
                fontSize: 32,
                fontWeight: FontWeight.bold,
                color: ColorPalette.white,
                glowColor: ColorPalette.gold,
              ),
            ],
          ),
        ),
        SizedBox(width: 30),
        Column(children: [ChessPointsWidget(points: storePoints)]),
        SizedBox(width: 0),
      ],
    );
  }
}
