import 'package:flutter/material.dart';
import 'package:lce_ui/lce_ui.dart';

import '../api/api.dart';
import '../etat.dart';
import 'mes_commandes.dart';

/// Ouvre la connexion ; renvoie `true` si la personne s'est connectée.
Future<bool?> ouvrirConnexion(BuildContext context, {String? raison}) =>
    Navigator.of(context).push(MaterialPageRoute<bool>(fullscreenDialog: true, builder: (_) => EcranConnexion(raison: raison)));

/// Onglet « Compte ».
class EcranCompte extends StatelessWidget {
  const EcranCompte({super.key});

  @override
  Widget build(BuildContext context) {
    final session = Etat.of(context).session;
    return ListenableBuilder(
      listenable: session,
      builder: (context, _) {
        final profil = session.profil;
        return Scaffold(
          appBar: AppBar(title: const Text('Mon compte')),
          body: ListView(
            padding: const EdgeInsets.all(MiseEnPageLce.margeMobile),
            children: [
              Container(
                padding: const EdgeInsets.all(EspacesLce.e5),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(RayonsLce.carteMobile),
                  gradient: const LinearGradient(colors: [CouleursLce.navy, CouleursLce.navy700]),
                ),
                child: session.connecte
                    ? Row(
                        children: [
                          CircleAvatar(
                            radius: 28,
                            backgroundColor: CouleursLce.gold,
                            child: Text(
                              (profil?.nom.isNotEmpty ?? false) ? profil!.nom[0].toUpperCase() : '?',
                              style: TextesLce.h2.copyWith(color: CouleursLce.navy),
                            ),
                          ),
                          const SizedBox(width: EspacesLce.e4),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('Bonjour,', style: TextesLce.small.copyWith(color: CouleursLce.onNavy.withValues(alpha: 0.75))),
                                Text(profil?.nom ?? '…', style: TextesLce.h3.copyWith(color: CouleursLce.onNavy)),
                                if (profil?.telephone != null || profil?.email != null)
                                  Text((profil!.telephone ?? profil.email)!, style: TextesLce.small.copyWith(color: CouleursLce.gold)),
                              ],
                            ),
                          ),
                        ],
                      )
                    : Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Bienvenue', style: TextesLce.h2.copyWith(color: CouleursLce.onNavy)),
                          const SizedBox(height: EspacesLce.e2),
                          Text('Connectez-vous pour commander, suivre vos livraisons et retrouver vos favoris partout.',
                              style: TextesLce.body.copyWith(color: CouleursLce.onNavy.withValues(alpha: 0.8))),
                          const SizedBox(height: EspacesLce.e4),
                          LceBouton(libelle: 'Se connecter ou créer un compte', variante: VarianteBouton.or, onPressed: () => ouvrirConnexion(context)),
                        ],
                      ),
              ),
              const SizedBox(height: EspacesLce.e4),
              if (session.connecte)
                _Entree(IconeLce.commandes, 'Mes commandes', () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => const EcranMesCommandes()))),
              _Entree(IconeLce.telephone, 'Service client', () => _info(context, 'Appelez-nous ou écrivez-nous sur WhatsApp, du lundi au samedi de 8 h à 20 h.')),
              _Entree(IconeLce.livraison, 'Livraison et paiement', () => _info(context, 'Livraison à Bamako sous 24 à 48 h. Vous payez à la réception, en espèces ou par Mobile Money.')),
              if (session.connecte) ...[
                const SizedBox(height: EspacesLce.e4),
                _Entree(IconeLce.deconnexion, 'Se déconnecter', session.deconnecter, danger: true),
              ],
            ],
          ),
        );
      },
    );
  }

  void _info(BuildContext context, String texte) => showModalBottomSheet<void>(
        context: context,
        showDragHandle: true,
        builder: (_) => Padding(
          padding: const EdgeInsets.fromLTRB(EspacesLce.e5, 0, EspacesLce.e5, EspacesLce.e7),
          child: Text(texte, style: TextesLce.bodyLg),
        ),
      );
}

class _Entree extends StatelessWidget {
  const _Entree(this.icone, this.libelle, this.action, {this.danger = false});

  final IconeLce icone;
  final String libelle;
  final VoidCallback action;
  final bool danger;

  @override
  Widget build(BuildContext context) {
    final couleur = danger ? CouleursLce.danger : CouleursLce.navy;
    return Padding(
      padding: const EdgeInsets.only(bottom: EspacesLce.e2),
      child: Material(
        color: CouleursLce.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(RayonsLce.carteMobile), side: const BorderSide(color: CouleursLce.line)),
        child: ListTile(
          leading: LceIcone(icone, couleur: couleur),
          title: Text(libelle, style: TextesLce.body.copyWith(color: couleur, fontWeight: FontWeight.w600)),
          trailing: danger ? null : const LceIcone(IconeLce.chevronDroite, taille: 20, couleur: CouleursLce.inkMuted),
          onTap: action,
        ),
      ),
    );
  }
}

enum _Mode { connexion, inscription, code }

/// Connexion et inscription (code à 6 chiffres reçu par SMS ou e-mail).
class EcranConnexion extends StatefulWidget {
  const EcranConnexion({super.key, this.raison});

  final String? raison;

  @override
  State<EcranConnexion> createState() => _EcranConnexionState();
}

class _EcranConnexionState extends State<EcranConnexion> {
  final _cle = GlobalKey<FormState>();
  final _identifiant = TextEditingController();
  final _motDePasse = TextEditingController();
  final _nom = TextEditingController();
  final _code = TextEditingController();
  _Mode _mode = _Mode.connexion;
  bool _envoi = false;
  bool _masque = true;
  String? _erreur;

  @override
  void dispose() {
    for (final c in [_identifiant, _motDePasse, _nom, _code]) {
      c.dispose();
    }
    super.dispose();
  }

  /// « 76 00 00 01 » → « +22376000001 » ; une adresse e-mail reste telle quelle.
  String get _id {
    final brut = _identifiant.text.trim();
    if (brut.contains('@')) return brut.toLowerCase();
    final chiffres = brut.replaceAll(RegExp(r'\D'), '');
    return chiffres.length == 8 ? '+223$chiffres' : brut;
  }

  Future<void> _executer(Future<void> Function() action) async {
    if (!_cle.currentState!.validate()) return;
    setState(() {
      _envoi = true;
      _erreur = null;
    });
    try {
      await action();
    } on ErreurApi catch (e) {
      if (mounted) setState(() => _erreur = e.messageUtilisateur);
    } finally {
      if (mounted) setState(() => _envoi = false);
    }
  }

  late final Future<String?> _google = Etat.of(context).session.googleDisponible();

  /// Google crée le compte s'il n'existe pas : connexion et inscription ne font qu'un.
  Future<void> _viaGoogle() async {
    setState(() {
      _envoi = true;
      _erreur = null;
    });
    try {
      final ok = await Etat.of(context).session.connecterAvecGoogle();
      if (ok && mounted) Navigator.of(context).pop(true);
    } on ErreurApi catch (e) {
      if (mounted) setState(() => _erreur = e.messageUtilisateur);
    } finally {
      if (mounted) setState(() => _envoi = false);
    }
  }

  Future<void> _valider() {
    final session = Etat.of(context).session;
    return _executer(() async {
      switch (_mode) {
        case _Mode.connexion:
          await session.connecter(_id, _motDePasse.text);
          if (mounted) Navigator.of(context).pop(true);
        case _Mode.inscription:
          await session.demanderCode(_id);
          if (mounted) setState(() => _mode = _Mode.code);
        case _Mode.code:
          await session.inscrire(identifiant: _id, code: _code.text.trim(), nom: _nom.text.trim(), motDePasse: _motDePasse.text);
          if (mounted) Navigator.of(context).pop(true);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final inscription = _mode != _Mode.connexion;
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(tooltip: 'Fermer', onPressed: () => Navigator.of(context).pop(false), icon: const LceIcone(IconeLce.fermer)),
      ),
      body: Form(
        key: _cle,
        child: ListView(
          padding: const EdgeInsets.all(EspacesLce.e5),
          children: [
            Text(inscription ? 'Créer un compte' : 'Connexion', style: TextesLce.h1),
            const SizedBox(height: EspacesLce.e2),
            Text(
              _mode == _Mode.code
                  ? 'Saisissez le code à 6 chiffres envoyé à ${_identifiant.text.trim()}.'
                  : widget.raison ?? (inscription ? 'Quelques secondes suffisent.' : 'Heureux de vous revoir.'),
              style: TextesLce.body.copyWith(color: CouleursLce.inkMuted),
            ),
            const SizedBox(height: EspacesLce.e6),
            AnimatedSize(
              duration: const Duration(milliseconds: 220),
              curve: Curves.easeOutCubic,
              child: Column(
                children: [
                  if (_mode == _Mode.code) ...[
                    TextFormField(
                      controller: _code,
                      autofocus: true,
                      keyboardType: TextInputType.number,
                      maxLength: 6,
                      textAlign: TextAlign.center,
                      style: TextesLce.h2.copyWith(letterSpacing: 12),
                      decoration: const InputDecoration(counterText: '', hintText: '••••••'),
                      validator: (v) => RegExp(r'^\d{6}$').hasMatch(v ?? '') ? null : '6 chiffres attendus',
                    ),
                    TextButton(
                      onPressed: _envoi ? null : () => _executer(() => Etat.of(context).session.demanderCode(_id)),
                      child: const Text('Renvoyer le code'),
                    ),
                  ] else ...[
                    if (inscription) ...[
                      TextFormField(
                        controller: _nom,
                        textCapitalization: TextCapitalization.words,
                        autofillHints: const [AutofillHints.name],
                        decoration: const InputDecoration(labelText: 'Nom complet'),
                        validator: (v) => (v ?? '').trim().length < 2 ? 'Nom obligatoire' : null,
                      ),
                      const SizedBox(height: EspacesLce.e3),
                    ],
                    TextFormField(
                      controller: _identifiant,
                      keyboardType: TextInputType.emailAddress,
                      autofillHints: const [AutofillHints.telephoneNumber, AutofillHints.email],
                      decoration: const InputDecoration(labelText: 'Téléphone ou e-mail', hintText: '76 00 00 00'),
                      validator: (_) => RegExp(r'^(\+223\d{8}|[^\s@]+@[^\s@]+\.[^\s@]+)$').hasMatch(_id) ? null : 'Numéro à 8 chiffres ou adresse e-mail',
                    ),
                    const SizedBox(height: EspacesLce.e3),
                    TextFormField(
                      controller: _motDePasse,
                      obscureText: _masque,
                      autofillHints: [inscription ? AutofillHints.newPassword : AutofillHints.password],
                      decoration: InputDecoration(
                        labelText: 'Mot de passe',
                        helperText: inscription ? '8 caractères minimum, avec une lettre et un chiffre' : null,
                        suffixIcon: IconButton(
                          tooltip: _masque ? 'Afficher' : 'Masquer',
                          onPressed: () => setState(() => _masque = !_masque),
                          icon: LceIcone(_masque ? IconeLce.voir : IconeLce.masquer, taille: 20),
                        ),
                      ),
                      validator: (v) {
                        if ((v ?? '').isEmpty) return 'Mot de passe obligatoire';
                        if (inscription && !RegExp(r'^(?=.*[A-Za-zÀ-ÿ])(?=.*\d).{8,128}$').hasMatch(v!)) {
                          return '8 caractères minimum, avec une lettre et un chiffre';
                        }
                        return null;
                      },
                    ),
                  ],
                ],
              ),
            ),
            if (_erreur != null)
              Container(
                margin: const EdgeInsets.only(top: EspacesLce.e4),
                padding: const EdgeInsets.all(EspacesLce.e3),
                decoration: BoxDecoration(color: CouleursLce.dangerSoft, borderRadius: BorderRadius.circular(RayonsLce.controle)),
                child: Text(_erreur!, style: TextesLce.small.copyWith(color: CouleursLce.danger)),
              ),
            const SizedBox(height: EspacesLce.e5),
            LceBouton(
              libelle: _envoi
                  ? 'Un instant…'
                  : switch (_mode) {
                      _Mode.connexion => 'Se connecter',
                      _Mode.inscription => 'Recevoir mon code',
                      _Mode.code => 'Créer mon compte',
                    },
              pleineLargeur: true,
              onPressed: _envoi ? null : _valider,
            ),
            if (_mode != _Mode.code)
              FutureBuilder<String?>(
                future: _google,
                builder: (context, s) => s.data == null
                    ? const SizedBox.shrink()
                    : Column(
                        children: [
                          const SizedBox(height: EspacesLce.e4),
                          Row(
                            children: [
                              const Expanded(child: Divider()),
                              Padding(
                                padding: const EdgeInsets.symmetric(horizontal: EspacesLce.e3),
                                child: Text('ou', style: TextesLce.small.copyWith(color: CouleursLce.inkMuted)),
                              ),
                              const Expanded(child: Divider()),
                            ],
                          ),
                          const SizedBox(height: EspacesLce.e4),
                          LceBouton(
                            libelle: inscription ? "S'inscrire avec Google" : 'Continuer avec Google',
                            variante: VarianteBouton.contour,
                            pleineLargeur: true,
                            icone: const _LogoGoogle(),
                            onPressed: _envoi ? null : _viaGoogle,
                          ),
                        ],
                      ),
              ),
            const SizedBox(height: EspacesLce.e4),
            Center(
              child: TextButton(
                onPressed: _envoi
                    ? null
                    : () => setState(() {
                          _mode = inscription ? _Mode.connexion : _Mode.inscription;
                          _erreur = null;
                        }),
                child: Text(inscription ? "J'ai déjà un compte" : 'Nouveau client ? Créer un compte'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// « G » aux quatre couleurs de Google, dessiné sans image.
class _LogoGoogle extends StatelessWidget {
  const _LogoGoogle();

  @override
  Widget build(BuildContext context) => const SizedBox.square(dimension: 20, child: CustomPaint(painter: _PeintreG()));
}

class _PeintreG extends CustomPainter {
  const _PeintreG();

  @override
  void paint(Canvas canvas, Size size) {
    final epaisseur = size.width * 0.2;
    final cadre = Rect.fromLTWH(epaisseur / 2, epaisseur / 2, size.width - epaisseur, size.height - epaisseur);
    final p = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = epaisseur;
    const tour = 6.283185307179586;
    // Rouge en haut, jaune à gauche, vert en bas, bleu à droite.
    for (final (debut, angle, couleur) in const [
      (-2.4, 1.55, Color(0xFFEA4335)),
      (2.35, 1.6, Color(0xFFFBBC05)),
      (0.75, 1.6, Color(0xFF34A853)),
      (0.0, 0.75, Color(0xFF4285F4)),
    ]) {
      canvas.drawArc(cadre, debut, angle * tour / 6.283185307179586, false, p..color = couleur);
    }
    canvas.drawLine(Offset(size.width / 2, size.height / 2), Offset(size.width - epaisseur / 2, size.height / 2), p..color = const Color(0xFF4285F4));
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
