// Fichier généré par tools/jetons/generer.mjs depuis libs/design-tokens/src : ne pas modifier.

import 'package:flutter/painting.dart';

/// Couleurs LCE (thème clair).
abstract final class CouleursLce {
  static const navy = Color(0xFF0B1C3F);
  static const navy700 = Color(0xFF13285C);
  static const navy500 = Color(0xFF1F3C82);
  static const gold = Color(0xFFD4A62A);
  static const goldBright = Color(0xFFE9BE3F);
  static const goldDeep = Color(0xFFB8871A);
  static const goldSoft = Color(0xFFF8EFD4);
  static const goldText = Color(0xFF8A6410);
  static const surface = Color(0xFFFFFFFF);
  static const surfaceIvoire = Color(0xFFFAF6EC);
  static const ink = Color(0xFF0B1C3F);
  static const inkMuted = Color(0xFF5A6378);
  static const line = Color(0xFFE6E0D2);
  static const success = Color(0xFF1E7A4C);
  static const successSoft = Color(0xFFE3F2EA);
  static const danger = Color(0xFFB3261E);
  static const dangerSoft = Color(0xFFFBE7E5);
  static const infoSoft = Color(0xFFE5EBF7);
  static const neutreSoft = Color(0xFFECEDF1);
  static const promo = Color(0xFFE30613);
  static const onGold = Color(0xFF0B1C3F);
  static const onNavy = Color(0xFFFFFFFF);
  static const focus = Color(0xFF1F3C82);
  static const admBg = Color(0xFFF4F5F9);
}

abstract final class PolicesLce {
  static const titre = 'Playfair Display';
  static const texte = 'Montserrat';
}

/// Échelle d'espacement : 4, 8, 12, 16, 24, 32, 48, 64.
abstract final class EspacesLce {
  static const double e1 = 4;
  static const double e2 = 8;
  static const double e3 = 12;
  static const double e4 = 16;
  static const double e5 = 24;
  static const double e6 = 32;
  static const double e7 = 48;
  static const double e8 = 64;
}

abstract final class RayonsLce {
  static const double badge = 4;
  static const double controle = 8;
  static const double carteMobile = 12;
  static const double carte = 16;
  static const double pastille = 999;
}

abstract final class MiseEnPageLce {
  static const double margeOrdinateur = 32;
  static const double margeMobile = 16;
  static const double largeurMax = 1280;
  static const double cibleTactile = 44;
  static const double boutonMobile = 52;
}

/// Styles de texte (tailles mobiles).
abstract final class TextesLce {
  static const display = TextStyle(
    fontFamily: PolicesLce.titre,
    fontSize: 36,
    height: 1.167,
    fontWeight: FontWeight.w600,
  );
  static const h1 = TextStyle(
    fontFamily: PolicesLce.titre,
    fontSize: 30,
    height: 1.200,
    fontWeight: FontWeight.w600,
  );
  static const h2 = TextStyle(
    fontFamily: PolicesLce.titre,
    fontSize: 28,
    height: 1.286,
    fontWeight: FontWeight.w600,
  );
  static const h3 = TextStyle(
    fontFamily: PolicesLce.titre,
    fontSize: 20,
    height: 1.400,
    fontWeight: FontWeight.w600,
  );
  static const bodyLg = TextStyle(
    fontFamily: PolicesLce.texte,
    fontSize: 17,
    height: 1.529,
    fontWeight: FontWeight.w400,
  );
  static const body = TextStyle(
    fontFamily: PolicesLce.texte,
    fontSize: 15,
    height: 1.600,
    fontWeight: FontWeight.w400,
  );
  static const label = TextStyle(
    fontFamily: PolicesLce.texte,
    fontSize: 14,
    height: 1.429,
    fontWeight: FontWeight.w600,
  );
  static const small = TextStyle(
    fontFamily: PolicesLce.texte,
    fontSize: 13,
    height: 1.538,
    fontWeight: FontWeight.w400,
  );
  static const surtitre = TextStyle(
    fontFamily: PolicesLce.texte,
    fontSize: 12,
    height: 1.333,
    fontWeight: FontWeight.w600,
    letterSpacing: 1.68,
  );
  static const prix = TextStyle(
    fontFamily: PolicesLce.texte,
    fontSize: 18,
    height: 1.333,
    fontWeight: FontWeight.w700,
    fontFeatures: [FontFeature.tabularFigures()],
  );
}
