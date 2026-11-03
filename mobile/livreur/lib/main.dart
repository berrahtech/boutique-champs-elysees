import 'package:flutter/material.dart';
import 'package:lce_ui/lce_ui.dart';

void main() => runApp(const ApplicationLivreur());

class ApplicationLivreur extends StatelessWidget {
  const ApplicationLivreur({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'LCE Livreur',
      debugShowCheckedModeBanner: false,
      theme: themeLce(livreur: true),
      home: const Coquille(),
    );
  }
}

/// Structure de l'application livreur. Lot 0 : la liste des livraisons montre
/// les composants ; les vrais écrans arrivent avec le module livraison.
class Coquille extends StatefulWidget {
  const Coquille({super.key});

  @override
  State<Coquille> createState() => _CoquilleState();
}

class _CoquilleState extends State<Coquille> {
  int _onglet = 0;
  bool _disponible = true;

  static const _livraisons = [
    (numero: 'LCE-2026-000124', quartier: 'Lafiabougou', montant: 41900, statut: 'AFFECTEE'),
    (numero: 'LCE-2026-000123', quartier: 'Hamdallaye ACI 2000', montant: 153600, statut: 'EN_COURS_LIVRAISON'),
    (numero: 'LCE-2026-000119', quartier: 'Badalabougou', montant: 8500, statut: 'LIVREE'),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(ongletsLivreur[_onglet].libelle)),
      body: _onglet == 0
          ? ListView(
              padding: const EdgeInsets.all(MiseEnPageLce.margeMobile),
              children: [
                LceBascule(
                  active: _disponible,
                  libelle: _disponible ? 'Disponible pour des livraisons' : 'Indisponible',
                  onChanged: (v) => setState(() => _disponible = v),
                ),
                const SizedBox(height: EspacesLce.e3),
                for (final l in _livraisons)
                  Card(
                    color: CouleursLce.surface,
                    elevation: 0,
                    margin: const EdgeInsets.only(bottom: EspacesLce.e3),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(RayonsLce.carteMobile),
                      side: const BorderSide(color: CouleursLce.line),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(EspacesLce.e4),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        spacing: EspacesLce.e2,
                        children: [
                          Row(
                            children: [
                              Expanded(child: Text(l.numero, style: TextesLce.label)),
                              LcePastilleStatut(statutsCommande[l.statut]!),
                            ],
                          ),
                          Text(l.quartier, style: TextesLce.body),
                          Text('À encaisser : ${formaterFcfa(l.montant)}', style: TextesLce.prix.copyWith(fontSize: 15)),
                        ],
                      ),
                    ),
                  ),
              ],
            )
          : Center(child: Text('${ongletsLivreur[_onglet].libelle} : écran à venir', style: TextesLce.body)),
      bottomNavigationBar: LceBarreOnglets(
        onglets: ongletsLivreur,
        actif: _onglet,
        onSelection: (i) => setState(() => _onglet = i),
        compteurs: const {0: 2},
      ),
    );
  }
}
