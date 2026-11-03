import 'package:flutter/material.dart';

import '../format.dart';
import '../icones.g.dart';
import '../jetons.g.dart';
import 'badge.dart';
import 'icone.dart';

class ProduitCarte {
  const ProduitCarte({
    required this.id,
    required this.nom,
    required this.prix,
    required this.imageUrl,
    this.prixBarre,
    this.nouveau = false,
  });

  final String id;
  final String nom;
  final int prix;
  final int? prixBarre;
  final bool nouveau;
  final String imageUrl;

  /// Pourcentage de réduction arrondi, 0 sans prix barré.
  int get remise => prixBarre != null && prixBarre! > prix ? ((1 - prix / prixBarre!) * 100).round() : 0;
}

/// Carte produit mobile (M-Carte) : cœur en haut à droite, nom sur 2 lignes
/// au plus, bouton rond « + » pour ajouter au panier.
class LceCarteProduit extends StatelessWidget {
  const LceCarteProduit({
    super.key,
    required this.produit,
    required this.favori,
    required this.onOuvrir,
    required this.onAjouter,
    required this.onFavori,
  });

  final ProduitCarte produit;
  final bool favori;
  final VoidCallback onOuvrir;
  final VoidCallback? onAjouter;
  final VoidCallback onFavori;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: CouleursLce.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(RayonsLce.carteMobile),
        side: const BorderSide(color: CouleursLce.line),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onOuvrir,
        child: Padding(
          padding: const EdgeInsets.all(EspacesLce.e3),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              AspectRatio(
                aspectRatio: 1,
                child: Stack(
                  children: [
                    Positioned.fill(
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          color: CouleursLce.surfaceIvoire,
                          borderRadius: BorderRadius.circular(RayonsLce.controle),
                        ),
                        child: Image.network(
                          produit.imageUrl,
                          fit: BoxFit.contain,
                          semanticLabel: produit.nom,
                          // Connexion instable : on garde le fond ivoire plutôt qu'une erreur.
                          errorBuilder: (_, _, _) => const SizedBox.shrink(),
                        ),
                      ),
                    ),
                    if (produit.remise > 0)
                      Positioned(top: 8, left: 8, child: LceBadge('-${produit.remise} %', type: TypeBadge.promo))
                    else if (produit.nouveau)
                      const Positioned(top: 8, left: 8, child: LceBadge('Nouveau', type: TypeBadge.nouveau)),
                    Positioned(
                      top: 0,
                      right: 0,
                      child: IconButton(
                        tooltip: favori ? 'Retirer des favoris' : 'Ajouter aux favoris',
                        onPressed: onFavori,
                        icon: LceIcone(
                          IconeLce.coeur,
                          taille: 22,
                          pleine: favori,
                          couleur: favori ? CouleursLce.danger : CouleursLce.navy,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: EspacesLce.e2),
              Text(
                produit.nom,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextesLce.label.copyWith(color: CouleursLce.ink),
              ),
              const SizedBox(height: EspacesLce.e1),
              Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (produit.remise > 0)
                          Text(
                            formaterFcfa(produit.prixBarre!),
                            style: TextesLce.small.copyWith(
                              color: CouleursLce.inkMuted,
                              decoration: TextDecoration.lineThrough,
                            ),
                          ),
                        Text(
                          formaterFcfa(produit.prix),
                          style: TextesLce.prix.copyWith(
                            fontSize: 15,
                            color: produit.remise > 0 ? CouleursLce.promo : CouleursLce.ink,
                          ),
                        ),
                      ],
                    ),
                  ),
                  SizedBox.square(
                    dimension: MiseEnPageLce.cibleTactile,
                    child: IconButton.filled(
                      tooltip: 'Ajouter ${produit.nom} au panier',
                      onPressed: onAjouter,
                      style: IconButton.styleFrom(
                        backgroundColor: CouleursLce.navy,
                        disabledBackgroundColor: CouleursLce.line,
                      ),
                      icon: const LceIcone(IconeLce.plus, taille: 20, couleur: CouleursLce.onNavy),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
