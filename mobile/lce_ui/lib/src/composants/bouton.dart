import 'package:flutter/material.dart';

import '../jetons.g.dart';

enum VarianteBouton { or, nuit, contour, clair }

/// Bouton LCE : 52 px de haut sur mobile (40 px en petit), rayon 8 px.
/// Un seul bouton [VarianteBouton.or] par écran : c'est l'action principale.
class LceBouton extends StatelessWidget {
  const LceBouton({
    super.key,
    required this.libelle,
    required this.onPressed,
    this.variante = VarianteBouton.nuit,
    this.petit = false,
    this.pleineLargeur = false,
    this.icone,
  });

  final String libelle;
  final VoidCallback? onPressed;
  final VarianteBouton variante;
  final bool petit;
  final bool pleineLargeur;
  final Widget? icone;

  @override
  Widget build(BuildContext context) {
    final (fond, texte, bordure) = switch (variante) {
      VarianteBouton.or => (CouleursLce.gold, CouleursLce.onGold, CouleursLce.goldDeep),
      VarianteBouton.nuit => (CouleursLce.navy, CouleursLce.onNavy, CouleursLce.navy),
      VarianteBouton.contour => (Colors.transparent, CouleursLce.navy, CouleursLce.navy),
      VarianteBouton.clair => (CouleursLce.surface, CouleursLce.navy, CouleursLce.line),
    };
    final style = ButtonStyle(
      minimumSize: WidgetStatePropertyAll(Size(pleineLargeur ? double.infinity : 0, petit ? 40 : MiseEnPageLce.boutonMobile)),
      padding: WidgetStatePropertyAll(EdgeInsets.symmetric(horizontal: petit ? EspacesLce.e4 : EspacesLce.e5)),
      backgroundColor: WidgetStateProperty.resolveWith(
        (etats) => etats.contains(WidgetState.pressed) && variante == VarianteBouton.or ? CouleursLce.goldBright : fond,
      ),
      foregroundColor: WidgetStatePropertyAll(texte),
      textStyle: const WidgetStatePropertyAll(TextesLce.label),
      shape: WidgetStatePropertyAll(
        RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(RayonsLce.controle),
          side: BorderSide(color: bordure),
        ),
      ),
      elevation: const WidgetStatePropertyAll(0),
    );
    final bouton = icone == null
        ? FilledButton(onPressed: onPressed, style: style, child: Text(libelle))
        : FilledButton.icon(onPressed: onPressed, style: style, icon: icone, label: Text(libelle));
    return Opacity(opacity: onPressed == null ? 0.5 : 1, child: bouton);
  }
}
