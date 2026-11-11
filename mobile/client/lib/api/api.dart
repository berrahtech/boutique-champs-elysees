import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

/// Adresse du serveur. En développement : `localhost` sur le web, `10.0.2.2`
/// (la machine hôte) dans l'émulateur Android. À fixer au build :
/// `flutter run --dart-define=SERVEUR=https://api.lce.ml`.
String get adresseServeur {
  const defini = String.fromEnvironment('SERVEUR');
  if (defini.isNotEmpty) return defini;
  if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) return 'http://10.0.2.2:3000';
  return 'http://localhost:3000';
}

/// URL absolue d'un média renvoyé par l'API (`/medias/...`).
String urlMedia(String? chemin) => chemin == null || chemin.isEmpty ? '' : '$adresseServeur$chemin';

/// Erreur de l'API (RFC 9457) ramenée à ce dont l'écran a besoin.
class ErreurApi implements Exception {
  ErreurApi(this.code, this.message, [this.details = const {}]);

  /// Dernier segment du type : « otp-invalide », « compte-existant »…
  final String code;
  final String message;
  final Map<String, dynamic> details;

  bool get reseau => code == 'reseau';

  /// Texte à montrer, en français et actionnable.
  String get messageUtilisateur {
    switch (code) {
      case 'otp-invalide':
        final n = details['essaisRestants'];
        return 'Code incorrect. Il vous reste $n essai${n == 1 ? '' : 's'}.';
      case 'otp-expire':
        return 'Ce code a expiré ou a déjà servi. Demandez un nouveau code.';
      case 'trop-de-tentatives':
        final s = (details['reessayerDansSecondes'] as num?) ?? 60;
        return 'Trop de tentatives. Réessayez dans ${(s / 60).ceil()} minute(s).';
      case 'compte-existant':
        return 'Un compte existe déjà avec cet identifiant. Connectez-vous.';
      case 'identifiants-invalides':
        return 'Identifiant ou mot de passe incorrect.';
      case 'compte-inactif':
        return 'Ce compte est désactivé. Contactez le service client.';
      case 'donnees-invalides':
        final erreurs = details['erreurs'];
        return erreurs is List ? erreurs.join(' ') : message;
      case 'reseau':
        return 'Connexion impossible. Vérifiez votre connexion internet puis réessayez.';
      default:
        return message.isNotEmpty ? message : 'Une erreur est survenue. Réessayez dans un instant.';
    }
  }

  @override
  String toString() => 'ErreurApi($code, $message)';
}

/// Client HTTP de l'API `/api/v1`. Ajoute le jeton d'accès, et sur un 401
/// demande un nouveau jeton une seule fois avant de rejouer la requête.
class Api {
  Api({http.Client? client}) : _http = client ?? http.Client();

  final http.Client _http;

  /// Fourni par la session : jeton courant et renouvellement.
  String? Function() jeton = () => null;
  Future<bool> Function() renouveler = () async => false;

  Uri _uri(String chemin, [Map<String, String>? requete]) =>
      Uri.parse('$adresseServeur/api/v1$chemin').replace(queryParameters: requete == null || requete.isEmpty ? null : requete);

  Future<dynamic> get(String chemin, {Map<String, String>? requete}) => _envoyer('GET', chemin, requete: requete);
  Future<dynamic> post(String chemin, [Object? corps]) => _envoyer('POST', chemin, corps: corps);
  Future<dynamic> put(String chemin, [Object? corps]) => _envoyer('PUT', chemin, corps: corps);
  Future<dynamic> delete(String chemin) => _envoyer('DELETE', chemin);

  Future<dynamic> _envoyer(String methode, String chemin, {Object? corps, Map<String, String>? requete, bool rejeu = false}) async {
    final requeteHttp = http.Request(methode, _uri(chemin, requete))
      ..headers['Accept'] = 'application/json';
    final j = jeton();
    if (j != null) requeteHttp.headers['Authorization'] = 'Bearer $j';
    if (corps != null) {
      requeteHttp.headers['Content-Type'] = 'application/json';
      requeteHttp.body = jsonEncode(corps);
    }

    final http.Response reponse;
    try {
      reponse = await http.Response.fromStream(await _http.send(requeteHttp).timeout(const Duration(seconds: 20)));
    } on Exception {
      throw ErreurApi('reseau', 'Serveur injoignable');
    }

    if (reponse.statusCode == 401 && j != null && !rejeu && !chemin.startsWith('/auth/')) {
      if (await renouveler()) return _envoyer(methode, chemin, corps: corps, requete: requete, rejeu: true);
    }
    if (reponse.statusCode >= 502 || reponse.statusCode == 0) throw ErreurApi('reseau', 'Serveur injoignable');

    final texte = utf8.decode(reponse.bodyBytes);
    final contenu = texte.isEmpty ? null : jsonDecode(texte);
    if (reponse.statusCode >= 400) {
      final corpsErreur = contenu is Map<String, dynamic> ? contenu : <String, dynamic>{};
      final type = (corpsErreur['type'] as String?)?.split('/').last ?? 'inconnue';
      throw ErreurApi(type, (corpsErreur['detail'] ?? corpsErreur['title'] ?? '') as String, corpsErreur);
    }
    return contenu;
  }
}
