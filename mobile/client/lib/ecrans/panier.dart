import 'dart:async';

import 'package:flutter/material.dart';
import 'package:lce_ui/lce_ui.dart';

import '../api/api.dart';
import '../api/modeles.dart';
import '../etat.dart';
import 'commande.dart';
import 'communs.dart';
import 'compte.dart';

/// Onglet « Panier » : lignes, code promo et récapitulatif calculé par le serveur.
class EcranPanier extends StatefulWidget {
  const EcranPanier({super.key, required this.versAccueil});

  final VoidCallback versAccueil;

  @override
  State<EcranPanier> createState() => _EcranPanierState();
}

class _EcranPanierState extends State<EcranPanier> {
  late final Panier _panier = Etat.of(context).panier;
  final _code = TextEditingController();
  Apercu? _apercu;
  ErreurApi? _erreur;
  bool _charge = false;
  Timer? _attente;
  int _demande = 0;

  @override
  void initState() {
    super.initState();
    _code.text = _panier.codePromo ?? '';
    _panier.addListener(_planifier);
    _actualiser();
  }

  @override
  void dispose() {
    _panier.removeListener(_planifier);
    _attente?.cancel();
    _code.dispose();
    super.dispose();
  }

  /// Regroupe les appuis rapides sur +/− en un seul appel.
  void _planifier() {
    _attente?.cancel();
    _attente = Timer(const Duration(milliseconds: 300), _actualiser);
    setState(() {});
  }

  Future<void> _actualiser() async {
    if (_panier.lignes.isEmpty) {
      setState(() => _apercu = null);
      return;
    }
    final n = ++_demande;
    setState(() => _charge = true);
    try {
      final a = await _panier.apercu();
      if (mounted && n == _demande) {
        setState(() {
          _apercu = a;
          _erreur = null;
        });
      }
    } on ErreurApi catch (e) {
      if (mounted && n == _demande) setState(() => _erreur = e);
    } finally {
      if (mounted && n == _demande) setState(() => _charge = false);
    }
  }

  void _commander() {
    final etat = Etat.of(context);
    if (!etat.session.connecte) {
      ouvrirConnexion(context, raison: 'Connectez-vous pour passer commande.').then((ok) {
        if (ok == true && mounted) _commander();
      });
      return;
    }
    Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => const EcranCommande()));
  }

  @override
  Widget build(BuildContext context) {
    final a = _apercu;
    return Scaffold(
      appBar: AppBar(title: Text(_panier.nbArticles == 0 ? 'Panier' : 'Panier (${_panier.nbArticles})')),
      body: _panier.lignes.isEmpty
          ? MessageVide(
              icone: IconeLce.panier,
              titre: 'Votre panier est vide',
              texte: 'Parcourez nos rayons et ajoutez vos coups de cœur.',
              action: ('Découvrir la boutique', widget.versAccueil),
            )
          : a == null
              ? (_erreur != null
                  ? MessageVide(icone: IconeLce.wifiOff, titre: 'Impossible de calculer', texte: _erreur!.messageUtilisateur, action: ('Réessayer', _actualiser))
                  : const Center(child: CircularProgressIndicator(color: CouleursLce.goldDeep)))
              : ListView(
                  padding: const EdgeInsets.all(MiseEnPageLce.margeMobile),
                  children: [
                    for (final message in a.ajustements) _Alerte(message),
                    for (final l in a.lignes) _Ligne(l, quantite: _panier.lignes[l.produit.id] ?? l.quantite),
                    const SizedBox(height: EspacesLce.e4),
                    Carte(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Code promo', style: TextesLce.label),
                          const SizedBox(height: EspacesLce.e2),
                          Row(
                            children: [
                              Expanded(
                                child: TextField(
                                  controller: _code,
                                  textCapitalization: TextCapitalization.characters,
                                  decoration: const InputDecoration(hintText: 'Ex. BIENVENUE10', isDense: true),
                                  onSubmitted: _panier.appliquerCode,
                                ),
                              ),
                              const SizedBox(width: EspacesLce.e2),
                              LceBouton(libelle: 'Appliquer', variante: VarianteBouton.nuit, petit: true, onPressed: () => _panier.appliquerCode(_code.text)),
                            ],
                          ),
                          if (a.codeApplique != null)
                            Padding(
                              padding: const EdgeInsets.only(top: EspacesLce.e2),
                              child: Text('✓ ${a.codeApplique}', style: TextesLce.small.copyWith(color: CouleursLce.success)),
                            )
                          else if (a.codeRefuse != null && _panier.codePromo != null)
                            Padding(
                              padding: const EdgeInsets.only(top: EspacesLce.e2),
                              child: Text(a.codeRefuse!, style: TextesLce.small.copyWith(color: CouleursLce.danger)),
                            ),
                        ],
                      ),
                    ),
                    const SizedBox(height: EspacesLce.e4),
                    AnimatedOpacity(
                      opacity: _charge ? 0.5 : 1,
                      duration: const Duration(milliseconds: 150),
                      child: Carte(
                        child: Column(
                          children: [
                            LigneMontant('Sous-total (${a.nbArticles} article${a.nbArticles > 1 ? 's' : ''})', a.sousTotal),
                            if (a.remise > 0) LigneMontant('Remise', -a.remise),
                            const LigneMontant('Livraison', 0, texte: 'Selon le quartier'),
                            const Divider(height: EspacesLce.e5),
                            LigneMontant('Total', a.total, fort: true),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: EspacesLce.e6),
                  ],
                ),
      bottomNavigationBar: a == null || _panier.lignes.isEmpty
          ? null
          : SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(MiseEnPageLce.margeMobile),
                child: LceBouton(
                  libelle: 'Commander · ${formaterFcfa(a.total)}',
                  pleineLargeur: true,
                  onPressed: _charge || a.lignes.isEmpty ? null : _commander,
                ),
              ),
            ),
    );
  }
}

class _Alerte extends StatelessWidget {
  const _Alerte(this.texte);

  final String texte;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: EspacesLce.e3),
      padding: const EdgeInsets.all(EspacesLce.e3),
      decoration: BoxDecoration(color: CouleursLce.goldSoft, borderRadius: BorderRadius.circular(RayonsLce.controle)),
      child: Row(
        children: [
          const LceIcone(IconeLce.information, taille: 20, couleur: CouleursLce.goldText),
          const SizedBox(width: EspacesLce.e2),
          Expanded(child: Text(texte, style: TextesLce.small)),
        ],
      ),
    );
  }
}

class _Ligne extends StatelessWidget {
  const _Ligne(this.ligne, {required this.quantite});

  final LigneApercu ligne;
  final int quantite;

  @override
  Widget build(BuildContext context) {
    final p = ligne.produit;
    final panier = Etat.of(context).panier;
    return Dismissible(
      key: ValueKey(p.id),
      direction: DismissDirection.endToStart,
      onDismissed: (_) => panier.retirer(p.id),
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: EspacesLce.e5),
        margin: const EdgeInsets.only(bottom: EspacesLce.e3),
        decoration: BoxDecoration(color: CouleursLce.dangerSoft, borderRadius: BorderRadius.circular(RayonsLce.carteMobile)),
        child: const LceIcone(IconeLce.supprimer, couleur: CouleursLce.danger),
      ),
      child: Padding(
        padding: const EdgeInsets.only(bottom: EspacesLce.e3),
        child: Carte(
          padding: const EdgeInsets.all(EspacesLce.e3),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              GestureDetector(
                onTap: () => ouvrirProduit(context, p.slug),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(RayonsLce.controle),
                  child: SizedBox.square(dimension: 84, child: ImageProduit(p.vignette)),
                ),
              ),
              const SizedBox(width: EspacesLce.e3),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(child: Text(p.nom, style: TextesLce.body.copyWith(fontWeight: FontWeight.w600), maxLines: 2, overflow: TextOverflow.ellipsis)),
                        SizedBox.square(
                          dimension: 32,
                          child: IconButton(
                            padding: EdgeInsets.zero,
                            tooltip: 'Retirer',
                            onPressed: () => panier.retirer(p.id),
                            icon: const LceIcone(IconeLce.supprimer, taille: 18, couleur: CouleursLce.inkMuted),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: EspacesLce.e1),
                    Text(formaterFcfa(p.prix), style: TextesLce.prix),
                    const SizedBox(height: EspacesLce.e2),
                    LceQuantite(valeur: quantite, max: p.stock.clamp(1, 99), onChanged: (q) => panier.fixer(p.id, q)),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
