import 'package:flutter/material.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:ygg_pomodoro/enums/enums.dart';
import 'package:ygg_pomodoro/pages/app_links.dart';
import 'package:ygg_pomodoro/pages/home_page.dart';
import 'package:ygg_pomodoro/pages/player_control_page.dart';
import 'package:ygg_pomodoro/styles/color_palette.dart';
import 'package:ygg_pomodoro/widgets/glowing_icon.dart';

class CustomBottomNavBar extends StatelessWidget {
  final int currentIndex;
  final Function(int) onTap;
  final bool isChainPageOpened;

  const CustomBottomNavBar({
    super.key,
    required this.currentIndex,
    required this.onTap,
    this.isChainPageOpened = false,
  });

  @override
  Widget build(BuildContext context) {
    return BottomAppBar(
      shape: const CircularNotchedRectangle(),
      notchMargin: 0.0,
      color: ColorPalette.backgroundColor, // Dark background
      child: SizedBox(
        height: 70,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            _buildNavItem(
              //icon: Icons.groups_outlined,
              //icon: FontAwesomeIcons.usersRays,
              //label: "Community",
              icon: FontAwesomeIcons.radio,
              label: "Player",
              index: 0,
            ),
            // const SizedBox(width: 30), // Space for FAB notch
            _buildNavItem(
              icon: FontAwesomeIcons.house,
              label: "Home",
              index: 1,
            ),
            // const SizedBox(width: 30), // Space for FAB notch
            _buildNavItem(icon: FontAwesomeIcons.user, label: "User", index: 2),
          ],
        ),
      ),
    );
  }

  Widget _buildNavItem({
    required IconData icon,
    required String label,
    required int index,
  }) {
    final bool isSelected = currentIndex == index;
    return Expanded(
      child: InkWell(
        onTap: () => onTap(index),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          mainAxisSize: MainAxisSize.min,
          children: [
            GlowingIconButton(
              onPressed: () => onTap(index),
              icon: icon,
              iconColor:
                  isChainPageOpened
                      ? ColorPalette.lightGray
                      : isSelected
                      ? ColorPalette.white
                      : ColorPalette.lightGray,
              iconGlowColor:
                  isChainPageOpened
                      ? ColorPalette.lightGray
                      : isSelected
                      ? ColorPalette.gold
                      : ColorPalette.lightGray,
            ),
            // Icon(icon, color: isSelected ? Colors.amber : Colors.grey),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                color:
                    isChainPageOpened
                        ? ColorPalette.lightGray
                        : isSelected
                        ? ColorPalette.gold
                        : ColorPalette.lightGray,
                fontSize: 12,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class MainScaffoldWithNav extends StatefulWidget {
  const MainScaffoldWithNav({super.key});

  @override
  State<MainScaffoldWithNav> createState() => _MainScaffoldWithNavState();
}

class _MainScaffoldWithNavState extends State<MainScaffoldWithNav> {
  int _currentIndex = 1; // default to Home

  void _onTabSelected(int index) {
    setState(() {
      _currentIndex = index;
    });
  }

  Widget _getCurrentPage() {
    switch (_currentIndex) {
      case 0:
        return const PlayerControlPage(selectedApp: MusicApp.Spotify);
      case 2:
        return const AppLinkPage();
      default:
        return const HomePage();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: _getCurrentPage(),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
      floatingActionButton: FloatingActionButton(
        backgroundColor: Colors.amber,
        onPressed: () => _onTabSelected(1),
        child: const Icon(Icons.home),
      ),
      bottomNavigationBar: CustomBottomNavBar(
        currentIndex: _currentIndex,
        onTap: _onTabSelected,
      ),
    );
  }
}
