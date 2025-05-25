import 'package:flutter/material.dart';
import 'package:ygg_pomodoro/enums/enums.dart';
import 'package:ygg_pomodoro/pages/app_links.dart';
import 'package:ygg_pomodoro/pages/chain_page.dart';
import 'package:ygg_pomodoro/pages/home_page.dart';
import 'package:ygg_pomodoro/pages/player_control_page.dart';
import 'package:ygg_pomodoro/styles/color_palette.dart';
import 'package:ygg_pomodoro/widgets/view/navbar.dart';

class NavigationPage extends StatefulWidget {
  const NavigationPage({Key? key}) : super(key: key);

  @override
  NavigationPageState createState() => NavigationPageState();

  static NavigationPageState of(BuildContext context) {
    final state = context.findAncestorStateOfType<NavigationPageState>();
    if (state == null) throw Exception('No NavigationPage ancestor found in context!');
    return state;
  }
}

class NavigationPageState extends State<NavigationPage> {
  int _currentIndex = 1;
  // ignore: unused_field
  bool _showChainPage = false;

  void showChain() {
    setState(() => _showChainPage = true);
  }

  void hideChain() {
    setState(() => _showChainPage = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      // appBar: AppBar(
      //   title: Text('', style: TextStyle(color: Youtube.white)),
      //   backgroundColor: ColorPalette.backgroundColor,
      //   centerTitle: true,
      //   automaticallyImplyLeading: false, // Removes the back button
      // ),
      backgroundColor: ColorPalette.backgroundColor,
      body: _showChainPage ? ChainPage(onBack: hideChain) : _getCurrentPage(),
      // floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
      // floatingActionButton: FloatingActionButton(
      //   backgroundColor: Colors.amber,
      //   onPressed: () => _onTabSelected(1),
      //   child: const Icon(Icons.home),
      // ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          // boxShadow: [
          //   BoxShadow(
          //     color: ColorPalette.white.withAlpha(50),
          //     blurRadius: 30,
          //     offset: Offset(0, -10),
          //   ),
          //   BoxShadow(
          //     color: ColorPalette.almostBlack,
          //     blurRadius: 30,
          //     offset: Offset(0, 10),
          //   ),
          // ],
          shape: BoxShape.rectangle,
          // borderRadius: BorderRadius.all(Radius.circular(16)),
          color: ColorPalette.backgroundColor,
          border: BorderDirectional(top: BorderSide(color: ColorPalette.gold)),
        ),
        child: CustomBottomNavBar(
          currentIndex: _currentIndex,
          onTap: _onTabSelected,
          isChainPageOpened: _showChainPage,
        ),
      ),
    );
  }

  void _onTabSelected(int index) {
    setState(() {
      _currentIndex = index;
      _showChainPage = false; // Hide chain page if tab is changed
    });
  }

  Widget _getCurrentPage() {
    switch (_currentIndex) {
      case 0:
        return const PlayerControlPage(selectedApp: MusicApp.Spotify);
      case 2:
        return const AppLinkPage();
      case 1:
        return const HomePage();
      default:
        return const HomePage();
    }
  }
}
