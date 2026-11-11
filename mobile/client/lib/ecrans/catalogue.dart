import 'dart:async';

import 'package:flutter/material.dart';
import 'package:lce_ui/lce_ui.dart';

import '../api/api.dart';
import '../api/modeles.dart';
import '../etat.dart';
import 'communs.dart';

void ouvrirCatalogue(BuildContext context, {required String titre, String? categorie, String? filtre}) {
  Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => EcranCatalogue(titre: titre, categorie: categorie, filtre: filtre)));
}

void ouvrirRecherche(BuildContext context) {
  Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => const EcranCatalogue(titre: 'Recherche', recherche: true)));
}

/// Onglet « Catégories » : la liste complète.
class EcranCategories extends StatelessWidget {
  const EcranCategories({super.key});

  @override
  Widget build(BuildContext context) {
    final api = Etat.of(context).api;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Catégories'),
        actions: [IconButton(tooltip: 'Rechercher', onPressed: () => ouvrirRecherche(context), icon: const LceIcone(IconeLce.recherche))],
      ),
      body: Chargement<List<Categorie>>(
        charger: () async => [for (final c in await api.get('/categories') as List) Categorie.json(c as Json)],
        contenu: (context, categories, _) => ListView.separated(
          padding: const EdgeInsets.all(MiseEnPageLce.margeMobile),
          itemCount: categories.length,
          separatorBuilder: (_, _) => const SizedBox(height: EspacesLce.e3),
          itemBuilder: (context, i) {
            final c = categories[i];
            return Material(
              color: CouleursLce.surface,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(RayonsLce.carteMobile),
                side: const BorderSide(color: CouleursLce.line),
              ),
              child: ListTile(
                contentPadding: const EdgeInsets.symmetric(horizontal: EspacesLce.e4, vertical: EspacesLce.e2),
                leading: Container(
                  width: 48,
                  height: 48,
                  decoration: const BoxDecoration(color: CouleursLce.goldSoft, shape: BoxShape.circle),
                  child: Center(child: LceIcone(c.icone, couleur: CouleursLce.navy)),
                ),
                title: Text(c.nom, style: TextesLce.bodyLg.copyWith(fontWeight: FontWeight.w700)),
                subtitle: Text('${c.nbProduits} article${c.nbProduits > 1 ? 's' : ''}', style: TextesLce.small.copyWith(color: CouleursLce.inkMuted)),
                trailing: const LceIcone(IconeLce.chevronDroite, taille: 20, couleur: CouleursLce.inkMuted),
                onTap: () => ouvrirCatalogue(context, titre: c.nom, categorie: c.slug),
              ),
            );
          },
        ),
      ),
    );
  }
}

/// Liste paginée d'une catégorie, d'un filtre ou d'une recherche, avec tri.
class EcranCatalogue extends StatefulWidget {
  const EcranCatalogue({super.key, required this.titre, this.categorie, this.filtre, this.recherche = false});

  final String titre;
  final String? categorie, filtre;
  final bool recherche;

  @override
  State<EcranCatalogue> createState() => _EcranCatalogueState();
}

class _EcranCatalogueState extends State<EcranCatalogue> {
  static const _tris = {
    'popularite': 'Popularité',
    'nouveautes': 'Nouveautés',
    'prix-croissant': 'Prix croissant',
    'prix-decroissant': 'Prix décroissant',
  };

  final _produits = <Produit>[];
  final _defilement = ScrollController();
  String _tri = 'popularite';
  String _q = '';
  int _page = 0, _pages = 1, _total = 0;
  bool _charge = false;
  ErreurApi? _erreur;
  Timer? _attente;
  int _generation = 0;

  @override
  void initState() {
    super.initState();
    _defilement.addListener(() {
      if (_defilement.position.extentAfter < 600) _suite();
    });
    if (!widget.recherche) _suite();
  }

  @override
  void dispose() {
    _attente?.cancel();
    _defilement.dispose();
    super.dispose();
  }

  void _recommencer() {
    _generation++;
    setState(() {
      _produits.clear();
      _page = 0;
      _pages = 1;
      _erreur = null;
      _charge = false;
    });
    _suite();
  }

  Future<void> _suite() async {
    if (_charge || _page >= _pages || (widget.recherche && _q.length < 2)) return;
    final generation = _generation;
    setState(() {
      _charge = true;
      _erreur = null;
    });
    try {
      final r = Resultats.json(await Etat.of(context).api.get('/produits', requete: {
        'page': '${_page + 1}',
        'parPage': '20',
        'tri': _tri,
        'categorie': ?widget.categorie,
        'filtre': ?widget.filtre,
        if (_q.isNotEmpty) 'q': _q,
      }) as Json);
      if (!mounted || generation != _generation) return;
      setState(() {
        _produits.addAll(r.produits);
        _page = r.page;
        _pages = r.pages;
        _total = r.total;
      });
    } on ErreurApi catch (e) {
      if (mounted && generation == _generation) setState(() => _erreur = e);
    } finally {
      if (mounted && generation == _generation) setState(() => _charge = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final vide = !_charge && _erreur == null && _produits.isEmpty;
    return Scaffold(
      appBar: AppBar(
        title: widget.recherche
            ? TextField(
                autofocus: true,
                textInputAction: TextInputAction.search,
                decoration: const InputDecoration(hintText: 'Rechercher…', border: InputBorder.none, filled: false),
                onChanged: (v) {
                  _attente?.cancel();
                  _attente = Timer(const Duration(milliseconds: 350), () {
                    _q = v.trim();
                    _recommencer();
                  });
                },
              )
            : Text(widget.titre),
      ),
      body: CustomScrollView(
        controller: _defilement,
        slivers: [
          if (_produits.isNotEmpty || _charge)
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(MiseEnPageLce.margeMobile, EspacesLce.e3, MiseEnPageLce.margeMobile, EspacesLce.e3),
                child: Row(
                  children: [
                    Expanded(child: Text(_page == 0 ? '' : '$_total article${_total > 1 ? 's' : ''}', style: TextesLce.small.copyWith(color: CouleursLce.inkMuted))),
                    PopupMenuButton<String>(
                      initialValue: _tri,
                      onSelected: (t) {
                        _tri = t;
                        _recommencer();
                      },
                      itemBuilder: (_) => [for (final e in _tris.entries) PopupMenuItem(value: e.key, child: Text(e.value))],
                      child: Row(
                        children: [
                          const LceIcone(IconeLce.trier, taille: 18, couleur: CouleursLce.navy),
                          const SizedBox(width: EspacesLce.e1),
                          Text(_tris[_tri]!, style: TextesLce.label),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          if (_produits.isEmpty && _charge) const SliverFillRemaining(child: GrilleSquelette()),
          GrilleProduits(_produits),
          if (_erreur != null)
            SliverFillRemaining(
              hasScrollBody: false,
              child: MessageVide(icone: IconeLce.wifiOff, titre: 'Impossible de charger', texte: _erreur!.messageUtilisateur, action: ('Réessayer', _suite)),
            )
          else if (vide)
            SliverFillRemaining(
              hasScrollBody: false,
              child: widget.recherche && _q.length < 2
                  ? const MessageVide(icone: IconeLce.recherche, titre: 'Que cherchez-vous ?', texte: 'Tapez au moins deux lettres : parfum, bazin, téléphone…')
                  : const MessageVide(icone: IconeLce.sac, titre: 'Aucun article', texte: 'Essayez un autre mot ou une autre catégorie.'),
            )
          else if (_charge && _produits.isNotEmpty)
            const SliverToBoxAdapter(
              child: Padding(padding: EdgeInsets.all(EspacesLce.e5), child: Center(child: CircularProgressIndicator(color: CouleursLce.goldDeep))),
            ),
          const SliverToBoxAdapter(child: SizedBox(height: EspacesLce.e6)),
        ],
      ),
    );
  }
}
