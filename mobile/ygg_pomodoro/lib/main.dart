import 'dart:async';
import 'package:flutter/material.dart';
// ignore: library_prefixes
import 'package:app_links/app_links.dart' as deepLink;
import 'package:ygg_pomodoro/enums/enums.dart';
import 'package:ygg_pomodoro/services/main_api.dart';
import 'package:ygg_pomodoro/styles/color_palette.dart';
import 'package:ygg_pomodoro/widgets/custom_button.dart';
import 'package:ygg_pomodoro/styles/button_styles.dart';
import 'package:ygg_pomodoro/pages/timer_page.dart';
import 'package:ygg_pomodoro/pages/custom_timer_page.dart';
import 'package:ygg_pomodoro/pages/widgets_page.dart';
import 'package:ygg_pomodoro/pages/login_page.dart';
import 'package:ygg_pomodoro/pages/register_page.dart';
import 'package:ygg_pomodoro/pages/home_page.dart';
import 'package:ygg_pomodoro/pages/app_links.dart';
import 'package:ygg_pomodoro/pages/playlist_page.dart';
import 'package:ygg_pomodoro/pages/player_control_page.dart';
import 'package:ygg_pomodoro/widgets/skeleton_provider.dart';

void main() {
  runApp(const MyApp());
}

// Global navigator key for navigation from deep link callbacks.
final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

class MyApp extends StatefulWidget {
  const MyApp({super.key});

  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  bool _isLoading = true;
  late deepLink.AppLinks _appLinks;
  StreamSubscription? _sub;

  @override
  void initState() {
    super.initState();
    _appLinks = deepLink.AppLinks();
    _initDeepLinkListener();
    _initializeApp();
  }

  Future<void> _initializeApp() async {
    // 1. Wait for your API to be ready
    await mainAPI.initializeBaseUrl();

    // 2. When done, update state to remove loading UI
    if (mounted) {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _initDeepLinkListener() async {
    // Handle the deep link that might have launched the app.
    try {
      final initialLink = await _appLinks.getInitialLink();
      if (initialLink != null) {
        _handleDeepLink(initialLink);
      }
    } catch (e) {
      //print("Error retrieving initial link: $e");
    }

    // Listen for deep links while the app is running.
    _sub = _appLinks.uriLinkStream.listen(
      (link) {
        _handleDeepLink(link);
      },
      onError: (err) {
        //print("Error in link stream: $err");
      },
    );
  }

  void _handleDeepLink(Uri link) {
    // Process the deep link. If needed, convert the Uri to a String using link.toString()
    //print('Deep link received: $link');
    //navigatorKey.currentState?.pushNamed('/applinks');
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      navigatorKey: navigatorKey,
      title: 'Home Page',
      debugShowCheckedModeBanner: false,
      initialRoute: '/',
      home:
          _isLoading
              ? SkeletonProvider(
                  isLoading: _isLoading,
                  baseColor: ColorPalette.lightGray,
                  highlightColor: ColorPalette.gold,
                  child: Scaffold(
                    appBar: AppBar(title: Text('Home Page', style: TextStyle(color: Youtube.white)), backgroundColor: ColorPalette.backgroundColor),
                    backgroundColor: ColorPalette.backgroundColor,
                    body: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        children: [
                          // form field placeholder
                          const SizedBox(height: 200),

                          const SkeletonTextField(decoration: InputDecoration(hintText: 'Name')),
  
                          const SizedBox(height: 50),
  
                          // another form field
                          const SkeletonTextField(decoration: InputDecoration(hintText: 'Email')),
  
                          const SizedBox(height: 150),
  
                          // submit button placeholder
                          SkeletonButton(
                            child: const Text('Submit'),
                            width: 200,
                            onPressed: () {}, // will be ignored during loading
                          ),
                        ],
                      ),
                    ),
                  ),
                )


                // SkeletonFormPage(
                //   formFieldCount: 2,
                //   formFieldWidths: [0.8, 0.8],
                //   formFieldHeight: 78,
                //   formFieldSpacing: 40,
                //   formButtonCount: 1,
                //   formButtonWidths: [0.5],
                //   appBar: AppBar(title: Align(alignment: Alignment.center, child:  Text('Welcome Aboard'))),
                // )
              : StartPage(),
      routes: {
        '/login_page': (context) => LoginPage(),
        '/main': (context) => HomePage(),
        '/applinks': (context) => AppLinkPage(),
        '/register_page': (context) => RegisterPage(),
        '/playlists': (context) => PlaylistPage(),
        '/player':
            (context) => PlayerControlPage(selectedApp: MusicApp.Spotify),
        '/timer': (context) => TimerPage(),
        '/custom_timer': (context) => CustomTimerPage(),
        '/widget_page': (context) => WidgetShowroomPage(),
      },
    );
  }
}

class StartPage extends StatelessWidget {
  const StartPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Home Page')),
      body: Stack(
        children: [
          //Align(
          //  alignment: Alignment.topCenter,
          //  child: Padding(
          //    padding: const EdgeInsets.only(top: 50.0),
          //    child:
          //    CustomButton(
          //      text: "Button Customizer",
          //      onPressed: () {
          //        Navigator.pushNamed(context, '/button_customizer');
          //      },
          //      buttonParams: mainButtonParams,
          //    ),
          //  ),
          //),
          Align(
            alignment: Alignment.topCenter,
            child: Padding(
              padding: const EdgeInsets.only(top: 50.0),
              child: CustomButton(
                text: "Login Page",
                onPressed: () {
                  Navigator.pushNamed(context, '/login_page');
                },
                buttonParams: mainButtonParams,
              ),
            ),
          ),
          Align(
            alignment: Alignment.topCenter,
            child: Padding(
              padding: const EdgeInsets.only(top: 200.0),
              child: CustomButton(
                text: "Register Page",
                onPressed: () {
                  Navigator.pushNamed(context, '/register_page');
                },
                buttonParams: mainButtonParams,
              ),
            ),
          ),
          Align(
            alignment: Alignment.topCenter,
            child: Padding(
              padding: const EdgeInsets.only(top: 350.0),
              child: CustomButton(
                text: "Widget Page",
                onPressed: () {
                  Navigator.pushNamed(context, '/widget_page');
                },
                buttonParams: mainButtonParams,
              ),
            ),
          ),
          // Additional widgets can be added here.
        ],
      ),
    );
  }
}
