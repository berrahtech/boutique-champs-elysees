import 'package:flutter/widgets.dart';

import '../jetons.g.dart';

/// Une couleur par famille : bleu = en cours, vert = terminé, or = en attente,
/// rouge = échec, gris = annulé / inactif.
enum FamilleStatut { enCours, termine, attente, echec, inactif }

typedef Statut = ({String libelle, FamilleStatut famille});

/// Statuts de commande, valeurs identiques au schéma de base de données.
const statutsCommande = <String, Statut>{
  'EN_ATTENTE_PAIEMENT': (libelle: 'En attente de paiement', famille: FamilleStatut.attente),
  'CONFIRMEE': (libelle: 'Confirmée', famille: FamilleStatut.enCours),
  'EN_PREPARATION': (libelle: 'En préparation', famille: FamilleStatut.enCours),
  'EN_ATTENTE_AFFECTATION': (libelle: "En attente d'affectation", famille: FamilleStatut.attente),
  'AFFECTEE': (libelle: 'Affectée', famille: FamilleStatut.enCours),
  'EN_COURS_LIVRAISON': (libelle: 'En cours de livraison', famille: FamilleStatut.enCours),
  'LIVREE': (libelle: 'Livrée', famille: FamilleStatut.termine),
  'ECHEC_LIVRAISON': (libelle: 'Échec de livraison', famille: FamilleStatut.echec),
  'RETOUR_ENTREPOT': (libelle: "Retour à l'entrepôt", famille: FamilleStatut.inactif),
  'ANNULEE': (libelle: 'Annulée', famille: FamilleStatut.inactif),
};

/// Pastille de statut : point de couleur + libellé, jamais la couleur seule.
class LcePastilleStatut extends StatelessWidget {
  const LcePastilleStatut(this.statut, {super.key});

  final Statut statut;

  @override
  Widget build(BuildContext context) {
    final (fond, couleur) = switch (statut.famille) {
      FamilleStatut.enCours => (CouleursLce.infoSoft, CouleursLce.navy500),
      FamilleStatut.termine => (CouleursLce.successSoft, CouleursLce.success),
      FamilleStatut.attente => (CouleursLce.goldSoft, CouleursLce.goldText),
      FamilleStatut.echec => (CouleursLce.dangerSoft, CouleursLce.danger),
      FamilleStatut.inactif => (CouleursLce.neutreSoft, CouleursLce.inkMuted),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
      decoration: BoxDecoration(color: fond, borderRadius: BorderRadius.circular(RayonsLce.pastille)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(width: 8, height: 8, decoration: BoxDecoration(color: couleur, shape: BoxShape.circle)),
          const SizedBox(width: 6),
          Text(statut.libelle, style: TextesLce.small.copyWith(color: couleur, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}
