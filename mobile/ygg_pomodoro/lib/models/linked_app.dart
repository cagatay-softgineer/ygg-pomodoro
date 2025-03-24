import 'package:ygg_pomodoro/models/button_params.dart';

class LinkedApp {
  final String name; // Immutable property
  String buttonText;
  String userPic;
  String userDisplayName;
  ButtonParams appButtonParams;
  bool isLinked;

  LinkedApp({
    required this.name, // Name must be provided
    this.buttonText = "Checking...", // Default button text
    this.userPic = "", // Default user picture URL
    this.userDisplayName = "Checking...", // Default display name
    ButtonParams? appButtonParams, // Nullable to allow default instantiation
    this.isLinked = false, // Default linked state
  }) : appButtonParams = appButtonParams ?? ButtonParams(); // Default to new instance
}
