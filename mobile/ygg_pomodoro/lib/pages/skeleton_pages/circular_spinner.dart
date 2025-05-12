import 'package:flutter/material.dart';

class FullScreenSpinner extends StatelessWidget {
  const FullScreenSpinner({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: CircularProgressIndicator(),
      ),
    );
  }
}