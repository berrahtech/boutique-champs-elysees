// Fichier généré par tools/jetons/generer.mjs depuis libs/design-tokens/src : ne pas modifier.

import 'package:flutter/painting.dart';

/// Couleurs LCE (thème clair).
abstract final class CouleursLce {
  static const navy = Color(0xFF191C1F);
  static const navy700 = Color(0xFF000000);
  static const navy500 = Color(0xFF0B5EC7);
  static const gold = Color(0xFFFFB400);
  static const goldBright = Color(0xFFFFC633);
  static const goldDeep = Color(0xFFB87A00);
  static const goldSoft = Color(0xFFFFF3D1);
  static const goldText = Color(0xFF7A5600);
  static const primaireSoft = Color(0xFFE8F0FB);
  static const nuitClaire = Color(0xFF2C3136);
  static const surface = Color(0xFFFFFFFF);
  static const surfaceDouce = Color(0xFFFFFFFF);
  static const ink = Color(0xFF191C1F);
  static const inkMuted = Color(0xFF5F6368);
  static const line = Color(0xFFE6E8EA);
  static const lineFort = Color(0xFFC9CCCF);
  static const success = Color(0xFF1B7A4B);
  static const successSoft = Color(0xFFE4F4EB);
  static const danger = Color(0xFFC4231C);
  static const dangerSoft = Color(0xFFFCE8E6);
  static const infoSoft = Color(0xFFF1F5F9);
  static const neutreSoft = Color(0xFFF0F1F2);
  static const promo = Color(0xFFD7231E);
  static const nouveaute = Color(0xFF5A0FA8);
  static const etoile = Color(0xFFF59E0B);
  static const fondBanniere = Color(0xFFDCE3EC);
  static const peche = Color(0xFFFAD6C7);
  static const lilas = Color(0xFFE4CFE8);
  static const onGold = Color(0xFF191C1F);
  static const onNavy = Color(0xFFFFFFFF);
  static const focus = Color(0xFF0B5EC7);
  static const admBg = Color(0xFFF4F5F9);
  static const noir = Color(0xFF000000);
  static const saisieFond = Color(0xFFF1F1F1);
  static const facebook = Color(0xFF166FE5);
  static const orange = Color(0xFFC2570C);
  static const creme = Color(0xFFFFEFC2);
}

abstract final class PolicesLce {
  static const titre = 'Lato';
  static const texte = 'Lato';
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
  static const double carteMobile = 10;
  static const double carte = 12;
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
  );
  static const h2 = TextStyle(
    fontFamily: PolicesLce.titre,
    fontSize: 22,
    height: 1.273,
    fontWeight: FontWeight.w700,
  );
  static const h3 = TextStyle(
    fontFamily: PolicesLce.titre,
    fontSize: 17,
    height: 1.412,
    fontWeight: FontWeight.w700,
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
    fontWeight: FontWeight.w700,
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
    fontWeight: FontWeight.w700,
  );
  static const prix = TextStyle(
    fontFamily: PolicesLce.texte,
    fontSize: 18,
    height: 1.333,
    fontWeight: FontWeight.w700,
    fontFeatures: [FontFeature.tabularFigures()],
  );
}
