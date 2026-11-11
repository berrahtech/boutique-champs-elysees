import 'package:flutter/material.dart';
import 'package:lce_ui/lce_ui.dart';

import '../api/modeles.dart';
import '../etat.dart';
import 'communs.dart';

class EcranProduit extends StatelessWidget {
  const EcranProduit({super.key, required this.slug});

  final String slug;

  @override
  Widget build(BuildContext context) {
    final api = Etat.of(context).api;
    return Chargement<(Produit, List<Produit>)>(
      charger: () async {
        final j = await api.get('/produits/${Uri.encodeComponent(slug)}') as Json;
        return (Produit.json(j['produit'] as Json), [for (final p in j['similaires'] as List? ?? const []) Produit.json(p as Json)]);
      },
      squelette: Scaffold(appBar: AppBar(), body: const _Squelette()),
      contenu: (context, d, _) => _Fiche(produit: d.$1, similaires: d.$2),
    );
  }
}

class _Squelette extends StatelessWidget {
  const _Squelette();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(MiseEnPageLce.margeMobile),
      children: const [
        AspectRatio(aspectRatio: 1, child: Bloc(hauteur: double.infinity, rayon: RayonsLce.carteMobile)),
        SizedBox(height: EspacesLce.e5),
        Bloc(hauteur: 22),
        SizedBox(height: EspacesLce.e3),
        Bloc(largeur: 140, hauteur: 26),
        SizedBox(height: EspacesLce.e5),
        Bloc(),
        SizedBox(height: EspacesLce.e2),
        Bloc(),
      ],
    );
  }
}

class _Fiche extends StatefulWidget {
  const _Fiche({required this.produit, required this.similaires});

  final Produit produit;
  final List<Produit> similaires;

  @override
  State<_Fiche> createState() => _FicheState();
}

class _FicheState extends State<_Fiche> {
  int _quantite = 1;
  int _image = 0;

  @override
  Widget build(BuildContext context) {
    final p = widget.produit;
    final etat = Etat.of(context);
    final images = p.images.isEmpty ? [''] : p.images;

    return Scaffold(
      backgroundColor: CouleursLce.surface,
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            pinned: true,
            expandedHeight: MediaQuery.sizeOf(context).width.clamp(0, 520),
            backgroundColor: CouleursLce.surfaceDouce,
            actions: [
              ListenableBuilder(
                listenable: etat.favoris,
                builder: (_, _) {
                  final favori = etat.favoris.contient(p.id);
                  return IconButton(
                    tooltip: favori ? 'Retirer des favoris' : 'Ajouter aux favoris',
                    onPressed: () => etat.favoris.basculer(p.id),
                    icon: LceIcone(IconeLce.coeur, pleine: favori, couleur: favori ? CouleursLce.danger : CouleursLce.navy),
                  );
                },
              ),
            ],
            flexibleSpace: FlexibleSpaceBar(
              background: Stack(
                children: [
                  PageView.builder(
                    itemCount: images.length,
                    onPageChanged: (i) => setState(() => _image = i),
                    itemBuilder: (_, i) => Padding(
                      padding: const EdgeInsets.only(top: 56),
                      child: ImageProduit(images[i]),
                    ),
                  ),
                  if (images.length > 1)
                    Positioned(
                      bottom: EspacesLce.e3,
                      left: 0,
                      right: 0,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          for (var i = 0; i < images.length; i++)
                            AnimatedContainer(
                              duration: const Duration(milliseconds: 200),
                              margin: const EdgeInsets.symmetric(horizontal: 3),
                              width: i == _image ? 18 : 6,
                              height: 6,
                              decoration: BoxDecoration(
                                color: i == _image ? CouleursLce.goldDeep : CouleursLce.line,
                                borderRadius: BorderRadius.circular(3),
                              ),
                            ),
                        ],
                      ),
                    ),
                ],
              ),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.all(MiseEnPageLce.margeMobile),
            sliver: SliverList.list(
              children: [
                Text(p.categorie.toUpperCase(), style: TextesLce.surtitre.copyWith(color: CouleursLce.goldText)),
                const SizedBox(height: EspacesLce.e1),
                Text(p.nom, style: TextesLce.h2),
                if (p.nbAvis > 0) ...[
                  const SizedBox(height: EspacesLce.e2),
                  Row(
                    children: [
                      const LceIcone(IconeLce.etoile, taille: 16, pleine: true, couleur: CouleursLce.etoile),
                      const SizedBox(width: EspacesLce.e1),
                      Text('${p.note.toStringAsFixed(1).replaceAll('.', ',')}  ·  ${p.nbAvis} avis', style: TextesLce.small),
                    ],
                  ),
                ],
                const SizedBox(height: EspacesLce.e4),
                Wrap(
                  crossAxisAlignment: WrapCrossAlignment.center,
                  spacing: EspacesLce.e3,
                  children: [
                    Text(formaterFcfa(p.prix), style: TextesLce.prix.copyWith(fontSize: 26)),
                    if (p.prixBarre != null && p.remise > 0) ...[
                      Text(formaterFcfa(p.prixBarre!),
                          style: TextesLce.body.copyWith(color: CouleursLce.inkMuted, decoration: TextDecoration.lineThrough)),
                      LceBadge('−${p.remise} %', type: TypeBadge.promo),
                    ],
                  ],
                ),
                const SizedBox(height: EspacesLce.e3),
                _Disponibilite(p.stock),
                const SizedBox(height: EspacesLce.e5),
                Carte(
                  child: Column(
                    children: [
                      for (final (icone, texte) in const [
                        (IconeLce.livraison, 'Livraison à Bamako en 24 à 48 h'),
                        (IconeLce.especes, 'Paiement à la livraison, en espèces ou Mobile Money'),
                        (IconeLce.retour, 'Retour possible sous 7 jours'),
                      ])
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: EspacesLce.e1),
                          child: Row(
                            children: [
                              LceIcone(icone, taille: 20, couleur: CouleursLce.goldDeep),
                              const SizedBox(width: EspacesLce.e3),
                              Expanded(child: Text(texte, style: TextesLce.small)),
                            ],
                          ),
                        ),
                    ],
                  ),
                ),
                if (p.description.isNotEmpty) ...[
                  const SizedBox(height: EspacesLce.e5),
                  Text('Description', style: TextesLce.h3),
                  const SizedBox(height: EspacesLce.e2),
                  Text(p.description, style: TextesLce.body.copyWith(height: 1.55)),
                ],
                if (p.caracteristiques.isNotEmpty) ...[
                  const SizedBox(height: EspacesLce.e5),
                  Text('Caractéristiques', style: TextesLce.h3),
                  const SizedBox(height: EspacesLce.e2),
                  for (final (cle, valeur) in p.caracteristiques)
                    Container(
                      padding: const EdgeInsets.symmetric(vertical: EspacesLce.e2),
                      decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: CouleursLce.line))),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(child: Text(cle, style: TextesLce.small.copyWith(color: CouleursLce.inkMuted))),
                          Expanded(flex: 2, child: Text(valeur, style: TextesLce.small)),
                        ],
                      ),
                    ),
                ],
              ],
            ),
          ),
          if (widget.similaires.isNotEmpty) ...[
            const SliverToBoxAdapter(child: TitreSection('Vous aimerez aussi')),
            SliverToBoxAdapter(child: BandeProduits(widget.similaires)),
          ],
          const SliverToBoxAdapter(child: SizedBox(height: EspacesLce.e6)),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Container(
          padding: const EdgeInsets.fromLTRB(MiseEnPageLce.margeMobile, EspacesLce.e3, MiseEnPageLce.margeMobile, EspacesLce.e3),
          decoration: const BoxDecoration(color: CouleursLce.surface, border: Border(top: BorderSide(color: CouleursLce.line))),
          child: Row(
            children: [
              if (p.stock > 0) ...[
                LceQuantite(valeur: _quantite, max: p.stock.clamp(1, 99), onChanged: (q) => setState(() => _quantite = q)),
                const SizedBox(width: EspacesLce.e3),
              ],
              Expanded(
                child: LceBouton(
                  libelle: p.stock > 0 ? 'Ajouter au panier' : 'Épuisé',
                  pleineLargeur: true,
                  icone: const LceIcone(IconeLce.panierAjouter, taille: 20, couleur: CouleursLce.onGold),
                  onPressed: p.stock > 0 ? () => ajouterAuPanier(context, p, _quantite) : null,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Disponibilite extends StatelessWidget {
  const _Disponibilite(this.stock);

  final int stock;

  @override
  Widget build(BuildContext context) {
    final (couleur, texte) = switch (stock) {
      0 => (CouleursLce.danger, 'Épuisé pour le moment'),
      < 6 => (CouleursLce.goldText, 'Plus que $stock en stock'),
      _ => (CouleursLce.success, 'En stock'),
    };
    return Row(
      children: [
        Container(width: 8, height: 8, decoration: BoxDecoration(color: couleur, shape: BoxShape.circle)),
        const SizedBox(width: EspacesLce.e2),
        Text(texte, style: TextesLce.label.copyWith(color: couleur)),
      ],
    );
  }
}
