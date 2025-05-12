import 'package:flutter/material.dart';
import 'package:mesh_gradient/mesh_gradient.dart';

class ColorPalette{
  static Color gold = Color(0xFFD3AF37);
  static Color backgroundColor = Color(0xFF252930);
  static Color lightGray = Color(0xFF575B62);
  static Color white = Color(0xFFEFE9E3);
  static Color clickable = Color(0xFF87B3FF);
  static Color youtubeRed = Color(0xFFFF0000);
  static Color spotifyGreen = Color(0xFF1ED760);
  static Color linkedInBlue = Color(0xFF0072B1);
  static Color instagramPink = Color(0xFFC13584);
}


class Youtube{
  static Color red = Color(0xFFFF0000);
  static Color white = Color(0xFFFFFFFF);
  static Color almostBlack = Color(0xFF282828);
}

class Instagram{
  static Color yellow = Color(0xFFFFD600);
  static Color orange = Color(0xFFFF7A00);
  static Color pink = Color(0xFFFF0069);
  static Color purple = Color(0xFFD300C5);
  static Color violent = Color(0xFF7638FA);
}

class GradientPallette{
  static MeshGradient instagram = MeshGradient(
                            points: [
                              MeshGradientPoint(
                                position: const Offset(
                                  0.240,
                                  0.140,
                                ),
                                color: Instagram.violent,
                              ),
                              MeshGradientPoint(
                                position: const Offset(
                                  0.815,
                                  0.190,
                                ),
                                color: Instagram.purple,
                              ),
                              MeshGradientPoint(
                                position: const Offset(
                                  0.790,
                                  0.690,
                                ),
                                color: Instagram.pink,
                              ),
                              MeshGradientPoint(
                                position: const Offset(
                                  0.390,
                                  0.640,
                                ),
                                color: Instagram.orange,
                              ),
                              MeshGradientPoint(
                                position: const Offset(
                                  0.140,
                                  0.840,
                                ),
                                color: Instagram.yellow,
                              ),
                            ],
                            options: MeshGradientOptions(),
                            );

  static AnimatedMeshGradient animatedInstagram = AnimatedMeshGradient(
                            colors: [
                                Instagram.violent,
                                // Instagram.purple, // Animated Mesh Must Be have Max 4 Colors
                                Instagram.pink,
                                Instagram.orange,
                                Instagram.yellow,
                            ],
                            options: AnimatedMeshGradientOptions(
                              speed: 10,
                            ),
                            );

  static AnimatedMeshGradient animatedTest = AnimatedMeshGradient(
                            colors: [
                                ColorPalette.gold,
                                ColorPalette.backgroundColor,
                                ColorPalette.backgroundColor,
                                ColorPalette.backgroundColor,
                            ],
                            options: AnimatedMeshGradientOptions(
                              speed: 10,
                            ),
                            );

  static LinearGradient goldenOrder = LinearGradient(begin: Alignment.topRight, end: Alignment.bottomLeft, colors: [ColorPalette.gold,ColorPalette.backgroundColor]);

  static MeshGradient test = MeshGradient(
                            points: [
                              MeshGradientPoint(
                                position: const Offset(
                                  0.9,
                                  0.2,
                                ),
                                color: ColorPalette.gold,
                              ),
                              MeshGradientPoint(
                                position: const Offset(
                                  0.2,
                                  0.9,
                                ),
                                color: ColorPalette.backgroundColor,
                              ),
                            ],
                            options: MeshGradientOptions(
                              blend: 6,
                              noiseIntensity: 1
                            ),
                            );
}
