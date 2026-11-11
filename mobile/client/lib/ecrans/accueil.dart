import 'package:flutter/material.dart';
import 'package:lce_ui/lce_ui.dart';

import '../api/modeles.dart';
import '../etat.dart';
import 'catalogue.dart';
import 'communs.dart';

class EcranAccueil extends StatelessWidget {
  const EcranAccueil({super.key});

  @override
  Widget build(BuildContext context) {
    final api = Etat.of(context).api;
    Future<(Accueil, List<Categorie>)> charger() async {
      final r = await Future.wait([api.get('/accueil'), api.get('/categories')]);
      return (Accueil.json(r[0] as Json), [for (final c in r[1] as List) Categorie.json(c as Json)]);
    }

    return Scaffold(
      body: Chargement<(Accueil, List<Categorie>)>(
        charger: charger,
        squelette: const SafeArea(child: GrilleSquelette()),
        contenu: (context, d, recharger) {
          final (accueil, categories) = d;
          return RefreshIndicator(
            color: CouleursLce.goldDeep,
            onRefresh: recharger,
            child: CustomScrollView(
              slivers: [
                const _Entete(),
                SliverToBoxAdapter(child: _Banniere(remise: accueil.remiseMax)),
                SliverToBoxAdapter(child: _Atouts()),
                const SliverToBoxAdapter(child: TitreSection('Catégories', surtitre: 'Parcourir')),
                SliverToBoxAdapter(child: _Categories(categories)),
                if (accueil.promotions.isNotEmpty) ...[
                  SliverToBoxAdapter(
                    child: TitreSection('Offres du moment',
                        surtitre: "Jusqu'à −${accueil.remiseMax} %",
                        voirTout: () => ouvrirCatalogue(context, titre: 'Promotions', filtre: 'promotions')),
                  ),
                  SliverToBoxAdapter(child: BandeProduits(accueil.promotions)),
                ],
                if (accueil.nouveautes.isNotEmpty) ...[
                  SliverToBoxAdapter(
                    child: TitreSection('Nouveautés',
                        surtitre: 'Fraîchement arrivés',
                        voirTout: () => ouvrirCatalogue(context, titre: 'Nouveautés', filtre: 'nouveautes')),
                  ),
                  SliverToBoxAdapter(child: BandeProduits(accueil.nouveautes)),
                ],
                if (accueil.meilleuresVentes.isNotEmpty) ...[
                  SliverToBoxAdapter(
                    child: TitreSection('Meilleures ventes',
                        surtitre: 'Les préférés',
                        voirTout: () => ouvrirCatalogue(context, titre: 'Meilleures ventes', filtre: 'meilleures-ventes')),
                  ),
                  GrilleProduits(accueil.meilleuresVentes.take(6).toList()),
                ],
                const SliverToBoxAdapter(child: SizedBox(height: EspacesLce.e8)),
              ],
            ),
          );
        },
      ),
    );
  }
}

/// En-tête bleu nuit : logo et recherche.
class _Entete extends StatelessWidget {
  const _Entete();

  @override
  Widget build(BuildContext context) {
    return SliverAppBar(
      pinned: true,
      backgroundColor: CouleursLce.navy,
      surfaceTintColor: Colors.transparent,
      toolbarHeight: 60,
      titleSpacing: MiseEnPageLce.margeMobile,
      title: RichText(
        text: TextSpan(
          style: TextesLce.h3.copyWith(color: CouleursLce.onNavy, letterSpacing: 0.4),
          children: const [
            TextSpan(text: 'Les Champs '),
            TextSpan(text: 'Élysées', style: TextStyle(color: CouleursLce.gold)),
          ],
        ),
      ),
      bottom: PreferredSize(
        preferredSize: const Size.fromHeight(64),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(MiseEnPageLce.margeMobile, 0, MiseEnPageLce.margeMobile, EspacesLce.e3),
          child: Material(
            color: CouleursLce.surface,
            borderRadius: BorderRadius.circular(RayonsLce.pastille),
            child: InkWell(
              borderRadius: BorderRadius.circular(RayonsLce.pastille),
              onTap: () => ouvrirRecherche(context),
              child: const SizedBox(
                height: 48,
                child: Row(
                  children: [
                    SizedBox(width: EspacesLce.e4),
                    LceIcone(IconeLce.recherche, taille: 20, couleur: CouleursLce.inkMuted),
                    SizedBox(width: EspacesLce.e3),
                    Expanded(
                      child: Text('Rechercher un produit, une marque…',
                          maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(color: CouleursLce.inkMuted)),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _Banniere extends StatelessWidget {
  const _Banniere({required this.remise});

  final int remise;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(MiseEnPageLce.margeMobile, EspacesLce.e4, MiseEnPageLce.margeMobile, 0),
      child: Container(
        padding: const EdgeInsets.all(EspacesLce.e5),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(RayonsLce.carteMobile),
          gradient: const LinearGradient(colors: [CouleursLce.navy, CouleursLce.navy700], begin: Alignment.topLeft, end: Alignment.bottomRight),
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('OFFRES DU MOMENT', style: TextesLce.surtitre.copyWith(color: CouleursLce.gold)),
                  const SizedBox(height: EspacesLce.e2),
                  Text(remise > 0 ? "Jusqu'à −$remise %" : 'Shoppez mieux,\nvivez mieux !',
                      style: TextesLce.h1.copyWith(color: CouleursLce.onNavy)),
                  const SizedBox(height: EspacesLce.e2),
                  Text('Livraison à Bamako, payez à la réception.', style: TextesLce.small.copyWith(color: CouleursLce.onNavy.withValues(alpha: 0.8))),
                  const SizedBox(height: EspacesLce.e4),
                  LceBouton(
                    libelle: 'Découvrir',
                    variante: VarianteBouton.or,
                    petit: true,
                    onPressed: () => ouvrirCatalogue(context, titre: 'Promotions', filtre: 'promotions'),
                  ),
                ],
              ),
            ),
            const LceIcone(IconeLce.cadeau, taille: 72, couleur: CouleursLce.gold),
          ],
        ),
      ),
    );
  }
}

class _Atouts extends StatelessWidget {
  static const _liste = [
    (IconeLce.livraison, 'Livraison', '24 à 48 h'),
    (IconeLce.especes, 'À la livraison', 'Payez à la réception'),
    (IconeLce.mobile, 'Mobile', 'Orange et Moov'),
  ];

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(MiseEnPageLce.margeMobile, EspacesLce.e4, MiseEnPageLce.margeMobile, 0),
      child: IntrinsicHeight(
        child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          for (final (i, (icone, titre, texte)) in _liste.indexed) ...[
            if (i > 0) const SizedBox(width: EspacesLce.e2),
            Expanded(
              child: Carte(
                padding: const EdgeInsets.all(EspacesLce.e3),
                child: Column(
                  children: [
                    LceIcone(icone, taille: 24, couleur: CouleursLce.goldDeep),
                    const SizedBox(height: EspacesLce.e2),
                    Text(titre, style: TextesLce.label, textAlign: TextAlign.center, maxLines: 1, overflow: TextOverflow.ellipsis),
                    Text(texte, style: TextesLce.small.copyWith(color: CouleursLce.inkMuted), textAlign: TextAlign.center, maxLines: 2),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
      ),
    );
  }
}

class _Categories extends StatelessWidget {
  const _Categories(this.categories);

  final List<Categorie> categories;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 104,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: MiseEnPageLce.margeMobile),
        itemCount: categories.length,
        separatorBuilder: (_, _) => const SizedBox(width: EspacesLce.e3),
        itemBuilder: (context, i) {
          final c = categories[i];
          return InkWell(
            borderRadius: BorderRadius.circular(RayonsLce.carteMobile),
            onTap: () => ouvrirCatalogue(context, titre: c.nom, categorie: c.slug),
            child: SizedBox(
              width: 76,
              child: Column(
                children: [
                  Container(
                    width: 64,
                    height: 64,
                    decoration: const BoxDecoration(color: CouleursLce.goldSoft, shape: BoxShape.circle),
                    child: Center(child: LceIcone(c.icone, taille: 28, couleur: CouleursLce.navy)),
                  ),
                  const SizedBox(height: EspacesLce.e2),
                  Text(c.court, style: TextesLce.small, maxLines: 1, overflow: TextOverflow.ellipsis, textAlign: TextAlign.center),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
