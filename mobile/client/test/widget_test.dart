import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:lce_client/api/api.dart';
import 'package:lce_client/etat.dart';
import 'package:lce_client/main.dart';
import 'package:shared_preferences/shared_preferences.dart';

Map<String, dynamic> produit(String id, String nom, int prix, {int? prixBarre}) => {
      'id': id,
      'slug': 'p-$id',
      'nom': nom,
      'categorie': {'slug': 'beaute', 'nom': 'Beauté'},
      'prix': prix,
      'prixBarre': prixBarre,
      'nouveau': false,
      'noteMoyenne': 4.5,
      'nbAvis': 10,
      'stock': 5,
      'images': <dynamic>[],
      'description': '',
      'caracteristiques': <dynamic>[],
    };

/// Fausse API : accueil, catégories et aperçu du panier.
final faux = MockClient((r) async {
  final chemin = r.url.path.replaceFirst('/api/v1', '');
  Object corps = switch (chemin) {
    '/accueil' => {
        'promotions': [produit('a1', 'Crème au karité pur', 7500, prixBarre: 10000)],
        'nouveautes': <dynamic>[],
        'meilleuresVentes': <dynamic>[],
        'populaires': <dynamic>[],
        'remiseMax': 25,
      },
    '/categories' => [
        {'id': 'c1', 'slug': 'beaute', 'nom': 'Beauté', 'court': 'Beauté', 'icone': 'parfum', 'nbProduits': 3},
      ],
    '/panier/apercu' => {
        'lignes': [
          {'produit': produit('a1', 'Crème au karité pur', 7500), 'quantite': 1, 'sousTotal': 7500},
        ],
        'nbArticles': 1,
        'sousTotal': 7500,
        'frais': 0,
        'remise': 0,
        'total': 7500,
        'codeApplique': null,
        'codeRefuse': null,
        'ajustements': <dynamic>[],
      },
    _ => <String, dynamic>{},
  };
  return http.Response(jsonEncode(corps), 200, headers: {'content-type': 'application/json; charset=utf-8'});
});

void main() {
  testWidgets('l’accueil affiche les offres et l’ajout remplit le panier', (tester) async {
    SharedPreferences.setMockInitialValues({});
    tester.view.physicalSize = const Size(1170, 3600);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);
    final api = Api(client: faux);
    final session = Session(api);
    final panier = Panier(api, session);
    final favoris = Favoris(api, session);

    await tester.pumpWidget(Etat(api: api, session: session, panier: panier, favoris: favoris, child: const ApplicationClient()));
    await tester.pumpAndSettle();

    expect(find.text('Offres du moment'), findsOneWidget);
    expect(find.text('Crème au karité pur'), findsOneWidget);

    await tester.tap(find.byTooltip('Ajouter Crème au karité pur au panier'));
    await tester.pump();
    expect(panier.nbArticles, 1);

    await tester.tap(find.text('Panier'));
    await tester.pumpAndSettle(const Duration(milliseconds: 400));
    expect(find.text('Commander · 7 500 FCFA'), findsOneWidget);
  });
}
