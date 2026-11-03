import 'package:flutter/material.dart';

import '../icones.g.dart';
import '../jetons.g.dart';
import 'icone.dart';

typedef Onglet = ({String libelle, IconeLce icone});

/// Onglets de l'application client (M-TabBar).
const ongletsClient = <Onglet>[
  (libelle: 'Accueil', icone: IconeLce.accueil),
  (libelle: 'Catégories', icone: IconeLce.categories),
  (libelle: 'Panier', icone: IconeLce.panier),
  (libelle: 'Favoris', icone: IconeLce.coeur),
  (libelle: 'Compte', icone: IconeLce.compte),
];

/// Onglets de l'application livreur (L-TabBar).
const ongletsLivreur = <Onglet>[
  (libelle: 'Livraisons', icone: IconeLce.livraison),
  (libelle: 'Historique', icone: IconeLce.historique),
  (libelle: 'Caisse', icone: IconeLce.caisse),
  (libelle: 'Profil', icone: IconeLce.profil),
];

/// Barre d'onglets fixée en bas, fond bleu nuit, onglet actif en or.
/// [compteurs] associe un index d'onglet à une pastille (Panier, Livraisons…).
class LceBarreOnglets extends StatelessWidget {
  const LceBarreOnglets({
    super.key,
    required this.onglets,
    required this.actif,
    required this.onSelection,
    this.compteurs = const {},
  });

  final List<Onglet> onglets;
  final int actif;
  final ValueChanged<int> onSelection;
  final Map<int, int> compteurs;

  @override
  Widget build(BuildContext context) {
    return NavigationBarTheme(
      data: NavigationBarThemeData(
        backgroundColor: CouleursLce.navy,
        indicatorColor: CouleursLce.navy700,
        labelTextStyle: WidgetStateProperty.resolveWith(
          (etats) => TextesLce.small.copyWith(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: etats.contains(WidgetState.selected) ? CouleursLce.goldBright : CouleursLce.onNavy,
          ),
        ),
      ),
      child: NavigationBar(
        selectedIndex: actif,
        onDestinationSelected: onSelection,
        destinations: [
          for (final (i, onglet) in onglets.indexed)
            NavigationDestination(
              label: onglet.libelle,
              icon: _icone(onglet.icone, i, CouleursLce.onNavy),
              selectedIcon: _icone(onglet.icone, i, CouleursLce.goldBright),
            ),
        ],
      ),
    );
  }

  Widget _icone(IconeLce icone, int index, Color couleur) {
    final nombre = compteurs[index] ?? 0;
    return Badge(
      isLabelVisible: nombre > 0,
      label: Text(nombre > 99 ? '99+' : '$nombre'),
      backgroundColor: CouleursLce.gold,
      textColor: CouleursLce.onGold,
      child: LceIcone(icone, couleur: couleur),
    );
  }
}
