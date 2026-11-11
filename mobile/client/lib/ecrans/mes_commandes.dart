import 'package:flutter/material.dart';
import 'package:lce_ui/lce_ui.dart';

import '../api/api.dart';
import '../api/modeles.dart';
import '../etat.dart';
import 'communs.dart';

Statut _statut(String s) => statutsCommande[s] ?? (libelle: s, famille: FamilleStatut.inactif);

class EcranMesCommandes extends StatelessWidget {
  const EcranMesCommandes({super.key});

  @override
  Widget build(BuildContext context) {
    final api = Etat.of(context).api;
    return Scaffold(
      appBar: AppBar(title: const Text('Mes commandes')),
      body: Chargement<List<CommandeResume>>(
        charger: () async => [for (final c in await api.get('/commandes') as List) CommandeResume.json(c as Json)],
        contenu: (context, commandes, recharger) => commandes.isEmpty
            ? const MessageVide(icone: IconeLce.colis, titre: 'Aucune commande', texte: 'Vos commandes apparaîtront ici.')
            : RefreshIndicator(
                onRefresh: recharger,
                child: ListView.separated(
                  padding: const EdgeInsets.all(MiseEnPageLce.margeMobile),
                  itemCount: commandes.length,
                  separatorBuilder: (_, _) => const SizedBox(height: EspacesLce.e3),
                  itemBuilder: (context, i) {
                    final c = commandes[i];
                    return Material(
                      color: CouleursLce.surface,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(RayonsLce.carteMobile), side: const BorderSide(color: CouleursLce.line)),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(RayonsLce.carteMobile),
                        onTap: () async {
                          await Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => EcranSuiviCommande(numero: c.numero)));
                          await recharger();
                        },
                        child: Padding(
                          padding: const EdgeInsets.all(EspacesLce.e4),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Expanded(child: Text('N° ${c.numero}', style: TextesLce.body.copyWith(fontWeight: FontWeight.w700))),
                                  LcePastilleStatut(_statut(c.statut)),
                                ],
                              ),
                              const SizedBox(height: EspacesLce.e2),
                              Text(dateCourte(c.creeLe), style: TextesLce.small.copyWith(color: CouleursLce.inkMuted)),
                              const SizedBox(height: EspacesLce.e2),
                              Row(
                                children: [
                                  Expanded(child: Text('${c.nbArticles} article${c.nbArticles > 1 ? 's' : ''}', style: TextesLce.small)),
                                  Text(formaterFcfa(c.total), style: TextesLce.prix),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
      ),
    );
  }
}

/// Suivi d'une commande : frise des étapes, articles, adresse, annulation.
class EcranSuiviCommande extends StatefulWidget {
  const EcranSuiviCommande({super.key, required this.numero});

  final String numero;

  @override
  State<EcranSuiviCommande> createState() => _EcranSuiviCommandeState();
}

class _EcranSuiviCommandeState extends State<EcranSuiviCommande> {
  int _version = 0;

  Future<void> _annuler(Commande c) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Annuler la commande ?'),
        content: Text('La commande n° ${c.numero} sera annulée. Cette action est définitive.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Garder')),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: CouleursLce.danger),
            child: const Text('Annuler la commande'),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    try {
      await Etat.of(context).api.post('/commandes/${c.numero}/annulation');
      if (mounted) setState(() => _version++);
    } on ErreurApi catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.messageUtilisateur)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final api = Etat.of(context).api;
    return Scaffold(
      appBar: AppBar(title: Text('N° ${widget.numero}')),
      body: Chargement<Commande>(
        key: ValueKey(_version),
        charger: () async => Commande.json(await api.get('/commandes/${Uri.encodeComponent(widget.numero)}') as Json),
        squelette: const Center(child: CircularProgressIndicator(color: CouleursLce.goldDeep)),
        contenu: (context, c, recharger) => RefreshIndicator(
          onRefresh: recharger,
          child: ListView(
            padding: const EdgeInsets.all(MiseEnPageLce.margeMobile),
            children: [
              Carte(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(child: Text('Suivi', style: TextesLce.h3)),
                        LcePastilleStatut(_statut(c.statut)),
                      ],
                    ),
                    const SizedBox(height: EspacesLce.e4),
                    _Frise(c),
                  ],
                ),
              ),
              const SizedBox(height: EspacesLce.e4),
              Carte(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Articles', style: TextesLce.h3),
                    const SizedBox(height: EspacesLce.e2),
                    for (final l in c.lignes)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: EspacesLce.e2),
                        child: Row(
                          children: [
                            ClipRRect(
                              borderRadius: BorderRadius.circular(RayonsLce.controle),
                              child: SizedBox.square(dimension: 52, child: ImageProduit(l.image)),
                            ),
                            const SizedBox(width: EspacesLce.e3),
                            Expanded(child: Text('${l.quantite} × ${l.libelle}', style: TextesLce.small, maxLines: 2, overflow: TextOverflow.ellipsis)),
                            Text(formaterFcfa(l.prixUnitaire * l.quantite), style: TextesLce.small.copyWith(fontWeight: FontWeight.w600)),
                          ],
                        ),
                      ),
                    const Divider(height: EspacesLce.e5),
                    LigneMontant('Sous-total', c.sousTotal),
                    if (c.remise > 0) LigneMontant('Remise', -c.remise),
                    LigneMontant('Livraison', c.fraisLivraison, texte: c.fraisLivraison == 0 ? 'Offerte' : null),
                    LigneMontant(c.statut == 'LIVREE' ? 'Total payé' : 'À payer à la livraison', c.total, fort: true),
                  ],
                ),
              ),
              const SizedBox(height: EspacesLce.e4),
              Carte(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Livraison', style: TextesLce.h3),
                    const SizedBox(height: EspacesLce.e2),
                    Text(c.adresse.nom, style: TextesLce.body.copyWith(fontWeight: FontWeight.w600)),
                    Text(c.adresse.telephone, style: TextesLce.small),
                    Text('${c.adresse.quartier} · ${c.zone}', style: TextesLce.small),
                    Text(c.adresse.repere, style: TextesLce.small.copyWith(color: CouleursLce.inkMuted)),
                  ],
                ),
              ),
              if (c.annulable) ...[
                const SizedBox(height: EspacesLce.e5),
                LceBouton(libelle: 'Annuler la commande', variante: VarianteBouton.contour, pleineLargeur: true, onPressed: () => _annuler(c)),
              ],
              const SizedBox(height: EspacesLce.e6),
            ],
          ),
        ),
      ),
    );
  }
}

/// Frise verticale : étapes franchies (datées) puis étapes à venir.
class _Frise extends StatelessWidget {
  const _Frise(this.commande);

  final Commande commande;

  static const _parcours = ['CONFIRMEE', 'EN_PREPARATION', 'EN_COURS_LIVRAISON', 'LIVREE'];
  static const _libelles = {
    'CONFIRMEE': 'Commande confirmée',
    'EN_PREPARATION': 'En préparation',
    'EN_ATTENTE_AFFECTATION': 'Prête, en attente du livreur',
    'AFFECTEE': 'Livreur en route vers vous bientôt',
    'EN_COURS_LIVRAISON': 'En cours de livraison',
    'LIVREE': 'Livrée',
    'ECHEC_LIVRAISON': 'Livraison manquée',
    'RETOUR_ENTREPOT': "Retournée à l'entrepôt",
    'ANNULEE': 'Annulée',
  };

  @override
  Widget build(BuildContext context) {
    final faites = commande.historique;
    final dernier = faites.isEmpty ? commande.statut : faites.last.statut;
    final fini = const {'LIVREE', 'ANNULEE', 'RETOUR_ENTREPOT'}.contains(dernier);
    final rang = _parcours.indexOf(switch (dernier) {
      'EN_ATTENTE_AFFECTATION' || 'AFFECTEE' => 'EN_PREPARATION',
      'ECHEC_LIVRAISON' => 'EN_COURS_LIVRAISON',
      final s => s,
    });
    final aVenir = fini || rang < 0 ? <String>[] : _parcours.sublist(rang + 1);

    final etapes = [
      for (final (i, e) in faites.indexed) (e.statut, dateCourte(e.date), e.motif, true, i == faites.length - 1),
      for (final s in aVenir) (s, null, null, false, false),
    ];
    return Column(
      children: [
        for (final (i, (statut, date, motif, fait, courant)) in etapes.indexed)
          IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(
                  width: 24,
                  child: Column(
                    children: [
                      Container(
                        width: courant ? 18 : 12,
                        height: courant ? 18 : 12,
                        margin: EdgeInsets.only(top: courant ? 1 : 4),
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: fait ? (_statut(statut).famille == FamilleStatut.echec ? CouleursLce.danger : CouleursLce.goldDeep) : CouleursLce.surface,
                          border: Border.all(color: fait ? Colors.transparent : CouleursLce.lineFort, width: 2),
                          boxShadow: courant ? [BoxShadow(color: CouleursLce.gold.withValues(alpha: 0.4), blurRadius: 0, spreadRadius: 4)] : null,
                        ),
                      ),
                      if (i < etapes.length - 1)
                        Expanded(child: Container(width: 2, color: fait && etapes[i + 1].$4 ? CouleursLce.goldDeep : CouleursLce.line)),
                    ],
                  ),
                ),
                const SizedBox(width: EspacesLce.e3),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.only(bottom: EspacesLce.e4),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(_libelles[statut] ?? _statut(statut).libelle,
                            style: TextesLce.body.copyWith(
                              fontWeight: courant ? FontWeight.w700 : FontWeight.w500,
                              color: fait ? CouleursLce.ink : CouleursLce.inkMuted,
                            )),
                        if (date != null) Text(date, style: TextesLce.small.copyWith(color: CouleursLce.inkMuted)),
                        if (motif != null) Text(motif, style: TextesLce.small.copyWith(color: CouleursLce.danger)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}
