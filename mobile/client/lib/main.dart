import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lce_ui/lce_ui.dart';

import 'api/api.dart';
import 'ecrans/accueil.dart';
import 'ecrans/catalogue.dart';
import 'ecrans/compte.dart';
import 'ecrans/favoris.dart';
import 'ecrans/panier.dart';
import 'etat.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final api = Api();
  final session = Session(api);
  final panier = Panier(api, session);
  final favoris = Favoris(api, session);
  await Future.wait([panier.charger(), favoris.charger()]);
  // La session se rétablit en arrière-plan : l'accueil s'affiche tout de suite.
  session.restaurer();
  runApp(Etat(api: api, session: session, panier: panier, favoris: favoris, child: const ApplicationClient()));
}

class ApplicationClient extends StatelessWidget {
  const ApplicationClient({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = themeLce();
    return MaterialApp(
      title: 'Les Champs Élysées',
      debugShowCheckedModeBanner: false,
      theme: theme.copyWith(
        scaffoldBackgroundColor: CouleursLce.surfaceDouce,
        pageTransitionsTheme: const PageTransitionsTheme(builders: {
          TargetPlatform.android: FadeForwardsPageTransitionsBuilder(),
          TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
        }),
        appBarTheme: theme.appBarTheme.copyWith(
          backgroundColor: CouleursLce.surfaceDouce,
          surfaceTintColor: Colors.transparent,
          systemOverlayStyle: SystemUiOverlayStyle.dark,
        ),
      ),
      home: const Coquille(),
    );
  }
}

/// Structure de l'application : barre d'onglets fixe, chaque onglet garde son état.
class Coquille extends StatefulWidget {
  const Coquille({super.key});

  @override
  State<Coquille> createState() => _CoquilleState();
}

class _CoquilleState extends State<Coquille> {
  int _onglet = 0;
  final _visites = <int>{0};

  void _aller(int i) => setState(() {
        _onglet = i;
        _visites.add(i);
      });

  @override
  Widget build(BuildContext context) {
    final panier = Etat.of(context).panier;
    final ecrans = [
      const EcranAccueil(),
      const EcranCategories(),
      EcranPanier(versAccueil: () => _aller(0)),
      EcranFavoris(versAccueil: () => _aller(0)),
      const EcranCompte(),
    ];
    return Scaffold(
      body: IndexedStack(
        index: _onglet,
        // Un onglet n'est construit qu'à sa première visite.
        children: [for (var i = 0; i < ecrans.length; i++) _visites.contains(i) ? ecrans[i] : const SizedBox.shrink()],
      ),
      bottomNavigationBar: ListenableBuilder(
        listenable: panier,
        builder: (_, _) => LceBarreOnglets(
          onglets: ongletsClient,
          actif: _onglet,
          onSelection: _aller,
          compteurs: {2: panier.nbArticles},
        ),
      ),
    );
  }
}
