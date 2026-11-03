import 'package:flutter/material.dart';

import 'jetons.g.dart';

/// Thème clair LCE, à passer à MaterialApp(theme: themeLce()).
/// Le fond de l'application livreur est adm-bg ; celui du client est surface.
ThemeData themeLce({bool livreur = false}) {
  const schema = ColorScheme(
    brightness: Brightness.light,
    primary: CouleursLce.navy,
    onPrimary: CouleursLce.onNavy,
    secondary: CouleursLce.gold,
    onSecondary: CouleursLce.onGold,
    error: CouleursLce.danger,
    onError: CouleursLce.onNavy,
    surface: CouleursLce.surface,
    onSurface: CouleursLce.ink,
    outline: CouleursLce.line,
  );

  return ThemeData(
    useMaterial3: true,
    colorScheme: schema,
    scaffoldBackgroundColor: livreur ? CouleursLce.admBg : CouleursLce.surface,
    fontFamily: PolicesLce.texte,
    textTheme: const TextTheme(
      displayLarge: TextesLce.display,
      headlineLarge: TextesLce.h1,
      headlineMedium: TextesLce.h2,
      titleLarge: TextesLce.h3,
      bodyLarge: TextesLce.bodyLg,
      bodyMedium: TextesLce.body,
      labelLarge: TextesLce.label,
      bodySmall: TextesLce.small,
      labelSmall: TextesLce.surtitre,
    ).apply(bodyColor: CouleursLce.ink, displayColor: CouleursLce.ink),
    appBarTheme: const AppBarTheme(
      backgroundColor: CouleursLce.navy,
      foregroundColor: CouleursLce.onNavy,
      elevation: 0,
    ),
    dividerColor: CouleursLce.line,
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: CouleursLce.surface,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(RayonsLce.controle),
        borderSide: const BorderSide(color: CouleursLce.line),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(RayonsLce.controle),
        borderSide: const BorderSide(color: CouleursLce.line),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(RayonsLce.controle),
        borderSide: const BorderSide(color: CouleursLce.focus, width: 2),
      ),
    ),
    // Animations courtes ; Flutter respecte déjà « réduire les animations » du système.
    pageTransitionsTheme: const PageTransitionsTheme(
      builders: {
        TargetPlatform.android: FadeForwardsPageTransitionsBuilder(),
        TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
      },
    ),
  );
}
