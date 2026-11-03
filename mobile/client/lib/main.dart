import 'package:flutter/material.dart';
import 'package:lce_ui/lce_ui.dart';

void main() => runApp(const ApplicationClient());

class ApplicationClient extends StatelessWidget {
  const ApplicationClient({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Les Champs Élysées',
      debugShowCheckedModeBanner: false,
      theme: themeLce(),
      home: const Coquille(),
    );
  }
}

/// Structure de l'application : barre d'onglets fixe, contenu qui défile.
/// Lot 0 : l'accueil montre les composants ; les vrais écrans arrivent au lot 1.
class Coquille extends StatefulWidget {
  const Coquille({super.key});

  @override
  State<Coquille> createState() => _CoquilleState();
}

class _CoquilleState extends State<Coquille> {
  int _onglet = 0;
  final _favoris = <String>{};
  int _articles = 0;

  static const _produits = [
    ProduitCarte(id: '1', nom: 'Eau de parfum Oud royal', prix: 38400, prixBarre: 48000, imageUrl: ''),
    ProduitCarte(id: '2', nom: 'Crème au karité pur', prix: 7500, nouveau: true, imageUrl: ''),
    ProduitCarte(id: '3', nom: 'Boubou en bazin riche brodé main, finition or', prix: 153600, imageUrl: ''),
    ProduitCarte(id: '4', nom: "Diffuseur d'encens", prix: 12000, imageUrl: ''),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(ongletsClient[_onglet].libelle)),
      body: _onglet == 0
          ? GridView.builder(
              padding: const EdgeInsets.all(MiseEnPageLce.margeMobile),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                mainAxisSpacing: EspacesLce.e3,
                crossAxisSpacing: EspacesLce.e3,
                childAspectRatio: 0.62,
              ),
              itemCount: _produits.length,
              itemBuilder: (context, i) {
                final produit = _produits[i];
                return LceCarteProduit(
                  produit: produit,
                  favori: _favoris.contains(produit.id),
                  onOuvrir: () {},
                  onAjouter: () => setState(() => _articles++),
                  onFavori: () => setState(
                    () => _favoris.contains(produit.id) ? _favoris.remove(produit.id) : _favoris.add(produit.id),
                  ),
                );
              },
            )
          : Center(child: Text('${ongletsClient[_onglet].libelle} : écran du lot 1', style: TextesLce.body)),
      bottomNavigationBar: LceBarreOnglets(
        onglets: ongletsClient,
        actif: _onglet,
        onSelection: (i) => setState(() => _onglet = i),
        compteurs: {2: _articles},
      ),
    );
  }
}
