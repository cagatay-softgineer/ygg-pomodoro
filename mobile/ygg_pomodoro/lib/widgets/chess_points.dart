import 'package:flutter/material.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';

class ChessPointsWidget extends StatelessWidget {
  final int points;
  const ChessPointsWidget({super.key, required this.points});

  @override
  Widget build(BuildContext context) {
    const glowColor = Color(0xFFFFE066); // yellowish glow

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              FontAwesomeIcons.chessKing,
              color: Colors.white,
              size: 28,
              shadows: [
                Shadow(blurRadius: 18, color: glowColor, offset: Offset(0, 0)),
                Shadow(blurRadius: 32, color: glowColor, offset: Offset(0, 0)),
              ],
            ),
            SizedBox(width: 4),
            Icon(
              FontAwesomeIcons.chessRook,
              color: Colors.white,
              size: 28,
              shadows: [
                Shadow(blurRadius: 18, color: glowColor, offset: Offset(0, 0)),
                Shadow(blurRadius: 32, color: glowColor, offset: Offset(0, 0)),
              ],
            ),
          ],
        ),
        SizedBox(height: 2),
        Text(
          points.toString(),
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w600,
            color: Colors.white,
            shadows: [
              Shadow(blurRadius: 12, color: glowColor, offset: Offset(0, 0)),
              Shadow(blurRadius: 24, color: glowColor, offset: Offset(0, 0)),
            ],
          ),
        )
      ],
    );
  }
}
