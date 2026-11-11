import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'api/api.dart';
import 'api/modeles.dart';

/// Session : le jeton d'accès (15 min) reste en mémoire, le jeton de
/// rafraîchissement (30 jours) dort dans le coffre du téléphone.
class Session extends ChangeNotifier {
  Session(this.api) {
    api.jeton = () => _acces;
    api.renouveler = _renouveler;
  }

  final Api api;
  static const _cle = 'lce.rafraichissement';
  final _coffre = const FlutterSecureStorage();

  String? _acces;
  String? _rafraichissement;
  Profil? profil;
  Future<bool>? _renouvellementEnCours;

  bool get connecte => _acces != null;

  Future<void> restaurer() async {
    try {
      _rafraichissement = await _coffre.read(key: _cle);
    } on Exception {
      _rafraichissement = null;
    }
    if (_rafraichissement != null && await _renouveler()) await _chargerProfil();
  }

  Future<void> connecter(String identifiant, String motDePasse) async {
    await _ouvrir(await api.post('/auth/connexion', {'identifiant': identifiant, 'motDePasse': motDePasse}) as Json);
  }

  Future<void> demanderCode(String identifiant) =>
      api.post('/auth/otp', {'identifiant': identifiant, 'objet': 'INSCRIPTION'});

  /// Vérifie le code puis crée le compte avec la preuve reçue.
  Future<void> inscrire({required String identifiant, required String code, required String nom, required String motDePasse}) async {
    final preuve = await api.post('/auth/otp/verifier', {'identifiant': identifiant, 'objet': 'INSCRIPTION', 'code': code}) as Json;
    await _ouvrir(await api.post('/auth/inscription', {'preuveOtp': preuve['preuveOtp'], 'nom': nom, 'motDePasse': motDePasse}) as Json);
  }

  /// Identifiant Google « Web » fourni par l'API (null : Google désactivé).
  /// Le SDK l'utilise comme `serverClientId` : le jeton reçu est destiné à l'API.
  Future<String?>? _googleId;
  Future<String?> googleDisponible() {
    if (kIsWeb || !GoogleSignIn.instance.supportsAuthenticate()) return Future.value();
    return _googleId ??= () async {
      try {
        final id = (await api.get('/auth/options') as Json)['googleClientId'] as String?;
        if (id != null) await GoogleSignIn.instance.initialize(serverClientId: id);
        return id;
      } on Object {
        _googleId = null;
        return null;
      }
    }();
  }

  /// Connexion ou inscription Google. Renvoie false si la personne a annulé.
  Future<bool> connecterAvecGoogle() async {
    if (await googleDisponible() == null) throw ErreurApi('google-indisponible', 'La connexion Google est indisponible pour le moment.');
    try {
      final compte = await GoogleSignIn.instance.authenticate();
      final jeton = compte.authentication.idToken;
      if (jeton == null) throw ErreurApi('google-indisponible', 'Google n’a pas fourni d’identité. Réessayez.');
      await _ouvrir(await api.post('/auth/google', {'jeton': jeton}) as Json);
      return true;
    } on GoogleSignInException catch (e) {
      if (e.code == GoogleSignInExceptionCode.canceled || e.code == GoogleSignInExceptionCode.interrupted) return false;
      throw ErreurApi('google-indisponible', 'La connexion Google a échoué. Réessayez ou utilisez votre téléphone.');
    }
  }

  Future<void> deconnecter() async {
    if (_googleId != null) unawaited(GoogleSignIn.instance.signOut().catchError((_) {}));
    final jeton = _rafraichissement;
    _effacer();
    if (jeton != null) unawaited(api.post('/auth/deconnexion', {'jetonRafraichissement': jeton}).catchError((_) => null));
  }

  Future<void> _ouvrir(Json paire) async {
    await _garder(paire);
    await _chargerProfil();
  }

  Future<void> _garder(Json paire) async {
    _acces = paire['jetonAcces'] as String;
    _rafraichissement = paire['jetonRafraichissement'] as String;
    await _coffre.write(key: _cle, value: _rafraichissement);
    notifyListeners();
  }

  Future<void> _chargerProfil() async {
    try {
      profil = Profil.json(await api.get('/moi') as Json);
      notifyListeners();
    } on ErreurApi {
      // Le profil reviendra au prochain affichage.
    }
  }

  /// Un seul renouvellement à la fois : les requêtes parallèles l'attendent.
  Future<bool> _renouveler() => _renouvellementEnCours ??= () async {
        try {
          final jeton = _rafraichissement;
          if (jeton == null) return false;
          await _garder(await api.post('/auth/rafraichir', {'jetonRafraichissement': jeton}) as Json);
          return true;
        } on ErreurApi catch (e) {
          // Hors ligne, on garde le jeton pour plus tard ; refusé, on oublie la session.
          if (!e.reseau) _effacer();
          return false;
        } finally {
          _renouvellementEnCours = null;
        }
      }();

  void _effacer() {
    _acces = null;
    _rafraichissement = null;
    profil = null;
    unawaited(_coffre.delete(key: _cle).catchError((_) {}));
    notifyListeners();
  }
}

/// Panier gardé sur le téléphone, recopié sur le compte une fois connecté.
/// Les montants viennent toujours du serveur (`/panier/apercu`).
class Panier extends ChangeNotifier {
  Panier(this.api, this.session) {
    session.addListener(_surSession);
  }

  final Api api;
  final Session session;
  static const _cle = 'lce.panier';

  final Map<String, int> lignes = {};
  String? codePromo;
  bool _etaitConnecte = false;

  int get nbArticles => lignes.values.fold(0, (a, b) => a + b);

  Future<void> charger() async {
    final prefs = await SharedPreferences.getInstance();
    final brut = prefs.getString(_cle);
    if (brut != null) {
      final j = jsonDecode(brut) as Json;
      lignes.addAll((j['lignes'] as Map).map((k, v) => MapEntry(k as String, (v as num).toInt())));
      codePromo = j['codePromo'] as String?;
    }
    notifyListeners();
  }

  void ajouter(String produitId, [int quantite = 1]) => _changer(() => lignes[produitId] = (lignes[produitId] ?? 0) + quantite);
  void fixer(String produitId, int quantite) => _changer(() => quantite <= 0 ? lignes.remove(produitId) : lignes[produitId] = quantite);
  void retirer(String produitId) => _changer(() => lignes.remove(produitId));
  void appliquerCode(String? code) => _changer(() => codePromo = (code?.trim().isEmpty ?? true) ? null : code!.trim().toUpperCase());
  void vider() => _changer(() {
        lignes.clear();
        codePromo = null;
      });

  List<Json> get lignesJson => [for (final e in lignes.entries) {'produitId': e.key, 'quantite': e.value}];

  Future<Apercu> apercu({String? zoneId}) async => Apercu.json(await api.post('/panier/apercu', {
        'lignes': lignesJson,
        'codePromo': codePromo,
        'zoneId': ?zoneId,
      }) as Json);

  void _changer(void Function() modification) {
    modification();
    notifyListeners();
    unawaited(_enregistrer());
  }

  Future<void> _enregistrer() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_cle, jsonEncode({'lignes': lignes, 'codePromo': codePromo}));
    if (session.connecte) {
      await api.put('/panier', {'lignes': lignesJson, 'codePromo': codePromo}).catchError((_) => null);
    }
  }

  /// À la connexion, on fusionne le panier du compte avec celui du téléphone.
  Future<void> _surSession() async {
    final connecte = session.connecte;
    if (connecte == _etaitConnecte) return;
    _etaitConnecte = connecte;
    if (!connecte) return;
    try {
      final distant = await api.get('/panier') as Json;
      for (final l in distant['lignes'] as List) {
        final id = l['produitId'] as String;
        final q = (l['quantite'] as num).toInt();
        if ((lignes[id] ?? 0) < q) lignes[id] = q;
      }
      codePromo ??= distant['codePromo'] as String?;
      _changer(() {});
    } on ErreurApi {
      // Fusion reportée à la prochaine connexion.
    }
  }
}

/// Favoris : sur le téléphone, et sur le compte une fois connecté.
class Favoris extends ChangeNotifier {
  Favoris(this.api, this.session) {
    session.addListener(_surSession);
  }

  final Api api;
  final Session session;
  static const _cle = 'lce.favoris';
  final Set<String> ids = {};
  bool _etaitConnecte = false;

  Future<void> charger() async {
    final prefs = await SharedPreferences.getInstance();
    ids.addAll(prefs.getStringList(_cle) ?? const []);
    notifyListeners();
  }

  bool contient(String id) => ids.contains(id);

  Future<void> basculer(String id) async {
    final ajout = ids.add(id);
    if (!ajout) ids.remove(id);
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList(_cle, ids.toList());
    if (session.connecte) {
      await (ajout ? api.post('/favoris', {'produitIds': [id]}) : api.delete('/favoris/$id')).catchError((_) => null);
    }
  }

  Future<void> _surSession() async {
    final connecte = session.connecte;
    if (connecte == _etaitConnecte) return;
    _etaitConnecte = connecte;
    if (!connecte) return;
    try {
      final tous = await api.post('/favoris', {'produitIds': ids.toList()}) as List;
      ids
        ..clear()
        ..addAll(tous.cast<String>());
      notifyListeners();
      final prefs = await SharedPreferences.getInstance();
      await prefs.setStringList(_cle, ids.toList());
    } on ErreurApi {
      // Synchronisation reportée.
    }
  }
}

/// Donne accès à l'état depuis n'importe quel écran.
class Etat extends InheritedWidget {
  const Etat({super.key, required this.api, required this.session, required this.panier, required this.favoris, required super.child});

  final Api api;
  final Session session;
  final Panier panier;
  final Favoris favoris;

  static Etat of(BuildContext context) => context.getInheritedWidgetOfExactType<Etat>()!;

  @override
  bool updateShouldNotify(Etat oldWidget) => false;
}
