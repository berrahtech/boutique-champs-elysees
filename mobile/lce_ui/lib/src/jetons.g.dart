// Fichier généré par tools/jetons/generer.mjs depuis libs/design-tokens/src : ne pas modifier.

import 'package:flutter/painting.dart';

/// Couleurs LCE (thème clair).
abstract final class CouleursLce {
  static const navy = Color(0xFF02027E);
  static const navy700 = Color(0xFF03035F);
  static const navy500 = Color(0xFF1C1CB0);
  static const gold = Color(0xFFD4A62A);
  static const goldBright = Color(0xFFE9BE3F);
  static const goldDeep = Color(0xFFB8871A);
  static const goldSoft = Color(0xFFF8EFD4);
  static const goldText = Color(0xFF8A6410);
  static const primaireSoft = Color(0xFFE9EAFC);
  static const nuitClaire = Color(0xFF2A2A9C);
  static const surface = Color(0xFFFFFFFF);
  static const surfaceDouce = Color(0xFFF6F7FA);
  static const ink = Color(0xFF23232E);
  static const inkMuted = Color(0xFF5F6374);
  static const line = Color(0xFFE8EAF0);
  static const lineFort = Color(0xFFCDD0DC);
  static const success = Color(0xFF1B7A4B);
  static const successSoft = Color(0xFFE4F4EB);
  static const danger = Color(0xFFC4231C);
  static const dangerSoft = Color(0xFFFCE8E6);
  static const infoSoft = Color(0xFFE6EFF8);
  static const neutreSoft = Color(0xFFECEDF1);
  static const promo = Color(0xFFD7231E);
  static const nouveaute = Color(0xFF5A0FA8);
  static const etoile = Color(0xFFF59E0B);
  static const fondBanniere = Color(0xFFDCE3EC);
  static const peche = Color(0xFFFAD6C7);
  static const lilas = Color(0xFFE4CFE8);
  static const onGold = Color(0xFF0B1C3F);
  static const onNavy = Color(0xFFFFFFFF);
  static const focus = Color(0xFF1C1CB0);
  static const admBg = Color(0xFFF4F5F9);
}

abstract final class PolicesLce {
  static const titre = 'Figtree';
  static const texte = 'Figtree';
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
  static const double badge = 6;
  static const double controle = 8;
  static const double carteMobile = 8;
  static const double carte = 10;
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
    fontSize: 30,
    height: 1.200,
    fontWeight: FontWeight.w700,
    letterSpacing: -0.75,
  );
  static const h1 = TextStyle(
    fontFamily: PolicesLce.titre,
    fontSize: 26,
    height: 1.231,
    fontWeight: FontWeight.w700,
    letterSpacing: -0.39,
  );
  static const h2 = TextStyle(
    fontFamily: PolicesLce.titre,
    fontSize: 22,
    height: 1.273,
    fontWeight: FontWeight.w600,
    letterSpacing: -0.22,
  );
  static const h3 = TextStyle(
    fontFamily: PolicesLce.titre,
    fontSize: 18,
    height: 1.444,
    fontWeight: FontWeight.w600,
  );
  static const bodyLg = TextStyle(
    fontFamily: PolicesLce.texte,
    fontSize: 16,
    height: 1.500,
    fontWeight: FontWeight.w400,
  );
  static const body = TextStyle(
    fontFamily: PolicesLce.texte,
    fontSize: 15,
    height: 1.467,
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
    height: 1.385,
    fontWeight: FontWeight.w400,
  );
  static const surtitre = TextStyle(
    fontFamily: PolicesLce.texte,
    fontSize: 13,
    height: 1.385,
    fontWeight: FontWeight.w600,
  );
  static const prix = TextStyle(
    fontFamily: PolicesLce.texte,
    fontSize: 18,
    height: 1.333,
    fontWeight: FontWeight.w600,
    fontFeatures: [FontFeature.tabularFigures()],
  );
}
