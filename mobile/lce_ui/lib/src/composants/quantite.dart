import 'package:flutter/material.dart';

import '../icones.g.dart';
import '../jetons.g.dart';
import 'icone.dart';

/// Sélecteur de quantité : min 1, max = stock disponible. Cibles de 44 px.
class LceQuantite extends StatelessWidget {
  const LceQuantite({super.key, required this.valeur, required this.onChanged, this.min = 1, this.max = 99});

  final int valeur;
  final int min;
  final int max;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    Widget bouton(IconeLce icone, String libelle, int? suivante) => SizedBox.square(
          dimension: MiseEnPageLce.cibleTactile,
          child: IconButton(
            tooltip: libelle,
            onPressed: suivante == null ? null : () => onChanged(suivante),
            color: CouleursLce.navy,
            disabledColor: CouleursLce.line,
            icon: LceIcone(icone, taille: 18, couleur: suivante == null ? CouleursLce.line : CouleursLce.navy),
          ),
        );

    return Container(
      decoration: BoxDecoration(
        border: Border.all(color: CouleursLce.line),
        borderRadius: BorderRadius.circular(RayonsLce.controle),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          bouton(IconeLce.moins, 'Diminuer la quantité', valeur > min ? valeur - 1 : null),
          SizedBox(
            width: 32,
            child: Semantics(
              liveRegion: true,
              label: 'Quantité',
              value: '$valeur',
              child: Text('$valeur', textAlign: TextAlign.center, style: TextesLce.label),
            ),
          ),
          bouton(IconeLce.plus, 'Augmenter la quantité', valeur < max ? valeur + 1 : null),
        ],
      ),
    );
  }
}
