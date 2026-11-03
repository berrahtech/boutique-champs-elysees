import 'package:flutter/widgets.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../icones.g.dart';

/// Icône 24 × 24, trait 1,75 px, couleur héritée (IconTheme) ou imposée.
/// Sans [libelle], l'icône est décorative et ignorée par les lecteurs d'écran.
class LceIcone extends StatelessWidget {
  const LceIcone(this.nom, {super.key, this.taille = 24, this.couleur, this.libelle, this.pleine = false});

  final IconeLce nom;
  final double taille;
  final Color? couleur;
  final String? libelle;

  /// Remplit le tracé (ex. cœur d'un favori actif).
  final bool pleine;

  @override
  Widget build(BuildContext context) {
    final teinte = couleur ?? IconTheme.of(context).color ?? const Color(0xFF000000);
    final svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" '
        'fill="${pleine ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.75" '
        'stroke-linecap="round" stroke-linejoin="round">${tracesIcones[nom]}</svg>';
    final image = SvgPicture.string(
      svg,
      width: taille,
      height: taille,
      theme: SvgTheme(currentColor: teinte),
    );
    return libelle == null ? ExcludeSemantics(child: image) : Semantics(label: libelle, image: true, child: image);
  }
}
