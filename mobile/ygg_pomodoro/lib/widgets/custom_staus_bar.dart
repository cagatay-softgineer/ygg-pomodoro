import 'package:flutter/material.dart';
import 'package:ygg_pomodoro/styles/color_palette.dart';
import 'package:ygg_pomodoro/widgets/glowing_text.dart';

// Your GlowingText from above should be imported

class CustomStatusBar extends StatelessWidget {
  final int stepCount;
  final int currentStep; // 0-based
  final List<int>? barStates; // Optional, custom states for each bar: 0=not started, 1=started, 2=finished

  const CustomStatusBar({
    super.key,
    required this.stepCount,
    required this.currentStep,
    this.barStates,
  });

  // Helper to get state (if barStates provided, use it; else use currentStep)
  int _getBarState(int index) {
    if (barStates != null && index < barStates!.length) {
      return barStates![index];
    }
    // Fallback: 2=finished, 1=started, 0=not started
    if (index < currentStep) return 2;
    if (index == currentStep) return 1;
    return 0;
  }

  Color _getBarColor(int state) {
    switch (state) {
      case 2:
        return ColorPalette.gold;
      case 1:
        return ColorPalette.white;
      case 0:
      default:
        return ColorPalette.white.withOpacity(0.3);
    }
  }

  double _getBarWidth(int stepCount) {
    return stepCount > 0 ? (200 / stepCount) : 50; // Adjust bar width as needed
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Progress label
        GlowingText(
          text: "${currentStep + 1}/$stepCount",
          fontSize: 18,
          fontWeight: FontWeight.w400,
          color: ColorPalette.white,
          glowColor: ColorPalette.gold,
        ),
        const SizedBox(height: 18),
        // Progress bars
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: List.generate(stepCount, (index) {
            int state = _getBarState(index);
            return Padding(
              padding: EdgeInsets.symmetric(horizontal: 8),
              child: Container(
                width: _getBarWidth(stepCount),
                height: 4,
                decoration: BoxDecoration(
                  color: _getBarColor(state),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            );
          }),
        ),
      ],
    );
  }
}
