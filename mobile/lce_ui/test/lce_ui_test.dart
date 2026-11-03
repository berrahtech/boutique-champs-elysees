import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lce_ui/lce_ui.dart';

Widget _dans(Widget enfant) => MaterialApp(theme: themeLce(), home: Scaffold(body: Center(child: enfant)));

void main() {
  group('formaterFcfa', () {
    test('sépare les milliers et place la devise après', () {
      expect(formaterFcfa(153600), '153\u202F600\u00A0FCFA');
      expect(formaterFcfa(500), '500\u00A0FCFA');
      expect(formaterFcfa(-2500), '-2\u202F500\u00A0FCFA');
    });
  });

  test('ProduitCarte calcule la remise arrondie', () {
    expect(const ProduitCarte(id: '1', nom: 'x', prix: 40000, prixBarre: 50000, imageUrl: '').remise, 20);
    expect(const ProduitCarte(id: '1', nom: 'x', prix: 40000, imageUrl: '').remise, 0);
  });

  testWidgets('la quantité ne descend pas sous le minimum', (tester) async {
    var valeur = 1;
    await tester.pumpWidget(_dans(StatefulBuilder(
      builder: (context, setState) => LceQuantite(valeur: valeur, max: 3, onChanged: (v) => setState(() => valeur = v)),
    )));
    await tester.tap(find.byTooltip('Diminuer la quantité'));
    expect(valeur, 1);
    for (var i = 0; i < 3; i++) {
      await tester.tap(find.byTooltip('Augmenter la quantité'));
      await tester.pump();
    }
    // Le 3e appui est sans effet : le maximum (stock) est atteint.
    expect(valeur, 3);
  });

  testWidgets('la carte affiche le badge promo plutôt que « Nouveau »', (tester) async {
    await tester.pumpWidget(_dans(SizedBox(
      width: 180,
      child: LceCarteProduit(
        produit: const ProduitCarte(id: '1', nom: 'Parfum', prix: 40000, prixBarre: 50000, nouveau: true, imageUrl: ''),
        favori: false,
        onOuvrir: () {},
        onAjouter: () {},
        onFavori: () {},
      ),
    )));
    expect(find.text('-20 %'), findsOneWidget);
    expect(find.text('NOUVEAU'), findsNothing);
    expect(find.byTooltip('Ajouter aux favoris'), findsOneWidget);
  });

  testWidgets('la pastille porte toujours un libellé', (tester) async {
    await tester.pumpWidget(_dans(LcePastilleStatut(statutsCommande['LIVREE']!)));
    expect(find.text('Livrée'), findsOneWidget);
  });

  testWidgets('la barre d’onglets affiche le compteur du panier', (tester) async {
    await tester.pumpWidget(MaterialApp(
      theme: themeLce(),
      home: Scaffold(
        bottomNavigationBar: LceBarreOnglets(onglets: ongletsClient, actif: 0, onSelection: (_) {}, compteurs: const {2: 3}),
      ),
    ));
    expect(find.text('Panier'), findsOneWidget);
    expect(find.text('3'), findsOneWidget);
  });
}
