import 'package:flutter/material.dart';
import 'package:lce_ui/lce_ui.dart';

import '../api/api.dart';
import '../api/modeles.dart';
import '../etat.dart';
import 'communs.dart';
import 'mes_commandes.dart';

/// Passage de commande : adresse, zone de livraison, paiement à la réception.
class EcranCommande extends StatelessWidget {
  const EcranCommande({super.key});

  @override
  Widget build(BuildContext context) {
    final api = Etat.of(context).api;
    return Scaffold(
      appBar: AppBar(title: const Text('Commande')),
      body: Chargement<(List<Zone>, Json)>(
        charger: () async {
          final r = await Future.wait([api.get('/zones'), api.get('/commandes/preremplissage')]);
          return ([for (final z in r[0] as List) Zone.json(z as Json)], (r[1] ?? <String, dynamic>{}) as Json);
        },
        squelette: const Center(child: CircularProgressIndicator(color: CouleursLce.goldDeep)),
        contenu: (_, d, _) => _Formulaire(zones: d.$1, prerempli: d.$2),
      ),
    );
  }
}

class _Formulaire extends StatefulWidget {
  const _Formulaire({required this.zones, required this.prerempli});

  final List<Zone> zones;
  final Json prerempli;

  @override
  State<_Formulaire> createState() => _FormulaireState();
}

class _FormulaireState extends State<_Formulaire> {
  final _cle = GlobalKey<FormState>();
  late final _nom = TextEditingController(text: (widget.prerempli['nom'] ?? Etat.of(context).session.profil?.nom ?? '') as String);
  late final _telephone = TextEditingController(text: _telLocal((widget.prerempli['telephone'] ?? Etat.of(context).session.profil?.telephone ?? '') as String));
  late final _quartier = TextEditingController(text: (widget.prerempli['quartier'] ?? '') as String);
  late final _repere = TextEditingController(text: (widget.prerempli['repere'] ?? '') as String);
  final _note = TextEditingController();
  late String? _zoneId = widget.zones.any((z) => z.id == widget.prerempli['zoneId']) ? widget.prerempli['zoneId'] as String : null;
  Apercu? _apercu;
  bool _envoi = false;
  String? _erreur;

  static String _telLocal(String t) => t.startsWith('+223') ? t.substring(4) : t;

  @override
  void initState() {
    super.initState();
    _calculer();
  }

  @override
  void dispose() {
    for (final c in [_nom, _telephone, _quartier, _repere, _note]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _calculer() async {
    try {
      final a = await Etat.of(context).panier.apercu(zoneId: _zoneId);
      if (mounted) setState(() => _apercu = a);
    } on ErreurApi catch (e) {
      if (mounted) setState(() => _erreur = e.messageUtilisateur);
    }
  }

  Future<void> _valider() async {
    if (!_cle.currentState!.validate()) return;
    final etat = Etat.of(context);
    setState(() {
      _envoi = true;
      _erreur = null;
    });
    try {
      final j = await etat.api.post('/commandes', {
        'lignes': etat.panier.lignesJson,
        'codePromo': etat.panier.codePromo,
        'zoneId': _zoneId,
        'moyen': 'A_LA_LIVRAISON',
        'note': _note.text.trim().isEmpty ? null : _note.text.trim(),
        'adresse': Adresse(nom: _nom.text.trim(), telephone: _telephone.text.trim(), quartier: _quartier.text.trim(), repere: _repere.text.trim()).json,
      }) as Json;
      final commande = Commande.json(j);
      etat.panier.vider();
      if (!mounted) return;
      await Navigator.of(context).pushReplacement(MaterialPageRoute<void>(builder: (_) => EcranConfirmation(commande)));
    } on ErreurApi catch (e) {
      if (!mounted) return;
      setState(() => _erreur = e.code == 'panier-modifie'
          ? 'Le stock a changé depuis votre visite. Vérifiez votre panier puis réessayez.'
          : e.messageUtilisateur);
      if (e.code == 'panier-modifie') await _calculer();
    } finally {
      if (mounted) setState(() => _envoi = false);
    }
  }

  String? _requis(String? v, String champ) => (v == null || v.trim().length < 2) ? '$champ obligatoire' : null;

  @override
  Widget build(BuildContext context) {
    final a = _apercu;
    return Form(
      key: _cle,
      child: ListView(
        padding: const EdgeInsets.all(MiseEnPageLce.margeMobile),
        children: [
          const _Etape(1, 'Livraison'),
          Carte(
            child: Column(
              children: [
                TextFormField(
                  controller: _nom,
                  textCapitalization: TextCapitalization.words,
                  decoration: const InputDecoration(labelText: 'Nom complet'),
                  validator: (v) => _requis(v, 'Nom'),
                ),
                const SizedBox(height: EspacesLce.e3),
                TextFormField(
                  controller: _telephone,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(labelText: 'Téléphone', prefixText: '+223 '),
                  validator: (v) => RegExp(r'^\d{8}$').hasMatch((v ?? '').replaceAll(' ', '')) ? null : '8 chiffres attendus',
                ),
                const SizedBox(height: EspacesLce.e3),
                DropdownButtonFormField<String>(
                  initialValue: _zoneId,
                  isExpanded: true,
                  decoration: const InputDecoration(labelText: 'Zone de livraison'),
                  items: [
                    for (final z in widget.zones)
                      DropdownMenuItem(value: z.id, child: Text('${z.nom} · ${z.frais == 0 ? 'gratuite' : formaterFcfa(z.frais)}', overflow: TextOverflow.ellipsis)),
                  ],
                  validator: (v) => v == null ? 'Choisissez votre zone' : null,
                  onChanged: (z) {
                    setState(() => _zoneId = z);
                    _calculer();
                  },
                ),
                const SizedBox(height: EspacesLce.e3),
                TextFormField(
                  controller: _quartier,
                  textCapitalization: TextCapitalization.words,
                  decoration: const InputDecoration(labelText: 'Quartier', hintText: 'Ex. Badalabougou'),
                  validator: (v) => _requis(v, 'Quartier'),
                ),
                const SizedBox(height: EspacesLce.e3),
                TextFormField(
                  controller: _repere,
                  decoration: const InputDecoration(labelText: 'Point de repère', hintText: 'Ex. près de la pharmacie du marché'),
                  validator: (v) => _requis(v, 'Point de repère'),
                ),
                const SizedBox(height: EspacesLce.e3),
                TextFormField(
                  controller: _note,
                  maxLines: 2,
                  decoration: const InputDecoration(labelText: 'Note pour le livreur (facultatif)'),
                ),
              ],
            ),
          ),
          const _Etape(2, 'Paiement'),
          const _Moyen(IconeLce.especes, 'À la livraison', 'Espèces ou Mobile Money au livreur', actif: true),
          const _Moyen(IconeLce.mobile, 'Orange Money', 'Bientôt disponible'),
          const _Moyen(IconeLce.mobile, 'Moov Money', 'Bientôt disponible'),
          const _Etape(3, 'Récapitulatif'),
          Carte(
            child: a == null
                ? const Center(child: Padding(padding: EdgeInsets.all(EspacesLce.e4), child: CircularProgressIndicator(color: CouleursLce.goldDeep)))
                : Column(
                    children: [
                      for (final l in a.lignes)
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: EspacesLce.e1),
                          child: Row(
                            children: [
                              Expanded(child: Text('${l.quantite} × ${l.produit.nom}', style: TextesLce.small, maxLines: 1, overflow: TextOverflow.ellipsis)),
                              Text(formaterFcfa(l.sousTotal), style: TextesLce.small),
                            ],
                          ),
                        ),
                      const Divider(height: EspacesLce.e4),
                      LigneMontant('Sous-total', a.sousTotal),
                      if (a.remise > 0) LigneMontant('Remise', -a.remise),
                      LigneMontant('Livraison', a.frais, texte: _zoneId == null ? 'Choisissez une zone' : (a.frais == 0 ? 'Offerte' : null)),
                      const Divider(height: EspacesLce.e4),
                      LigneMontant('À payer à la livraison', a.total, fort: true),
                    ],
                  ),
          ),
          if (_erreur != null)
            Padding(
              padding: const EdgeInsets.only(top: EspacesLce.e4),
              child: Text(_erreur!, style: TextesLce.body.copyWith(color: CouleursLce.danger)),
            ),
          const SizedBox(height: EspacesLce.e5),
          LceBouton(
            libelle: _envoi ? 'Envoi…' : 'Confirmer la commande',
            pleineLargeur: true,
            onPressed: _envoi || a == null || a.lignes.isEmpty ? null : _valider,
          ),
          const SizedBox(height: EspacesLce.e6),
        ],
      ),
    );
  }
}

class _Etape extends StatelessWidget {
  const _Etape(this.numero, this.titre);

  final int numero;
  final String titre;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: EspacesLce.e5, bottom: EspacesLce.e3),
      child: Row(
        children: [
          CircleAvatar(
            radius: 13,
            backgroundColor: CouleursLce.navy,
            child: Text('$numero', style: TextesLce.label.copyWith(color: CouleursLce.gold)),
          ),
          const SizedBox(width: EspacesLce.e3),
          Text(titre, style: TextesLce.h3),
        ],
      ),
    );
  }
}

class _Moyen extends StatelessWidget {
  const _Moyen(this.icone, this.titre, this.texte, {this.actif = false});

  final IconeLce icone;
  final String titre, texte;
  final bool actif;

  @override
  Widget build(BuildContext context) {
    return Opacity(
      opacity: actif ? 1 : 0.5,
      child: Container(
        margin: const EdgeInsets.only(bottom: EspacesLce.e2),
        padding: const EdgeInsets.all(EspacesLce.e3),
        decoration: BoxDecoration(
          color: actif ? CouleursLce.goldSoft : CouleursLce.surface,
          borderRadius: BorderRadius.circular(RayonsLce.carteMobile),
          border: Border.all(color: actif ? CouleursLce.goldDeep : CouleursLce.line, width: actif ? 1.5 : 1),
        ),
        child: Row(
          children: [
            LceIcone(icone, couleur: CouleursLce.navy),
            const SizedBox(width: EspacesLce.e3),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(titre, style: TextesLce.body.copyWith(fontWeight: FontWeight.w700)),
                  Text(texte, style: TextesLce.small.copyWith(color: CouleursLce.inkMuted)),
                ],
              ),
            ),
            if (actif) const LceIcone(IconeLce.valideRond, pleine: true, couleur: CouleursLce.goldDeep),
          ],
        ),
      ),
    );
  }
}

/// Écran de remerciement après la commande.
class EcranConfirmation extends StatelessWidget {
  const EcranConfirmation(this.commande, {super.key});

  final Commande commande;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(EspacesLce.e6),
          child: Column(
            children: [
              const Spacer(),
              TweenAnimationBuilder<double>(
                tween: Tween(begin: 0.4, end: 1),
                duration: const Duration(milliseconds: 600),
                curve: Curves.elasticOut,
                builder: (_, s, enfant) => Transform.scale(scale: s, child: enfant),
                child: Container(
                  padding: const EdgeInsets.all(EspacesLce.e5),
                  decoration: const BoxDecoration(color: CouleursLce.successSoft, shape: BoxShape.circle),
                  child: const LceIcone(IconeLce.succes, taille: 56, couleur: CouleursLce.success),
                ),
              ),
              const SizedBox(height: EspacesLce.e5),
              Text('Merci pour votre commande !', style: TextesLce.h2, textAlign: TextAlign.center),
              const SizedBox(height: EspacesLce.e2),
              Text('Commande n° ${commande.numero}', style: TextesLce.bodyLg.copyWith(color: CouleursLce.goldText, fontWeight: FontWeight.w700)),
              const SizedBox(height: EspacesLce.e3),
              Text(
                'Livraison sous ${commande.delaiHeures} h environ à ${commande.adresse.quartier}. '
                'Vous paierez ${formaterFcfa(commande.total)} au livreur.',
                style: TextesLce.body.copyWith(color: CouleursLce.inkMuted),
                textAlign: TextAlign.center,
              ),
              const Spacer(),
              LceBouton(
                libelle: 'Suivre ma commande',
                pleineLargeur: true,
                onPressed: () => Navigator.of(context).pushReplacement(
                  MaterialPageRoute<void>(builder: (_) => EcranSuiviCommande(numero: commande.numero)),
                ),
              ),
              const SizedBox(height: EspacesLce.e3),
              LceBouton(
                libelle: 'Continuer mes achats',
                variante: VarianteBouton.contour,
                pleineLargeur: true,
                onPressed: () => Navigator.of(context).pop(),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
