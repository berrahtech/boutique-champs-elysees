import 'package:flutter/widgets.dart';

import '../jetons.g.dart';

enum TypeBadge { promo, nouveau, premium }

/// Badge produit en capitales espacées : « -20 % », « Nouveau », « Premium ».
class LceBadge extends StatelessWidget {
  const LceBadge(this.texte, {super.key, required this.type});

  final String texte;
  final TypeBadge type;

  @override
  Widget build(BuildContext context) {
    final (fond, couleur) = switch (type) {
      TypeBadge.promo => (CouleursLce.promo, CouleursLce.onNavy),
      TypeBadge.nouveau => (CouleursLce.goldSoft, CouleursLce.goldText),
      TypeBadge.premium => (CouleursLce.navy, CouleursLce.goldBright),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: EspacesLce.e2, vertical: 2),
      decoration: BoxDecoration(color: fond, borderRadius: BorderRadius.circular(RayonsLce.badge)),
      child: Text(texte.toUpperCase(), style: TextesLce.surtitre.copyWith(fontSize: 11, color: couleur)),
    );
  }
}
