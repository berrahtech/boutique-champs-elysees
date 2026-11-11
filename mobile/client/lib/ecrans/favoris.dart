import 'package:flutter/material.dart';
import 'package:lce_ui/lce_ui.dart';

import '../api/modeles.dart';
import '../etat.dart';
import 'communs.dart';

/// Onglet « Favoris » : les produits du cœur, chargés par identifiant.
class EcranFavoris extends StatelessWidget {
  const EcranFavoris({super.key, required this.versAccueil});

  final VoidCallback versAccueil;

  @override
  Widget build(BuildContext context) {
    final etat = Etat.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Favoris')),
      body: ListenableBuilder(
        listenable: etat.favoris,
        builder: (context, _) {
          final ids = etat.favoris.ids.toList()..sort();
          if (ids.isEmpty) {
            return MessageVide(
              icone: IconeLce.coeur,
              titre: 'Aucun favori',
              texte: 'Touchez le cœur d’un article pour le retrouver ici.',
              action: ('Découvrir la boutique', versAccueil),
            );
          }
          return Chargement<List<Produit>>(
            key: ValueKey(ids.join(',')),
            charger: () async {
              final r = Resultats.json(await etat.api.get('/produits', requete: {'ids': ids.join(','), 'parPage': '48'}) as Json);
              return r.produits;
            },
            contenu: (_, produits, _) => CustomScrollView(
              slivers: [
                const SliverToBoxAdapter(child: SizedBox(height: EspacesLce.e4)),
                GrilleProduits(produits),
                const SliverToBoxAdapter(child: SizedBox(height: EspacesLce.e6)),
              ],
            ),
          );
        },
      ),
    );
  }
}
