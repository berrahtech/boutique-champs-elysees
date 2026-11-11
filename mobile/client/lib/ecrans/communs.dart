import 'package:flutter/material.dart';
import 'package:lce_ui/lce_ui.dart';

import '../api/api.dart';
import '../api/modeles.dart';
import '../etat.dart';
import 'produit.dart';

/// Charge une donnée, affiche un squelette pendant l'attente et une erreur
/// avec « Réessayer » si le réseau lâche.
class Chargement<T> extends StatefulWidget {
  const Chargement({super.key, required this.charger, required this.contenu, this.squelette});

  final Future<T> Function() charger;
  final Widget Function(BuildContext context, T donnee, Future<void> Function() recharger) contenu;
  final Widget? squelette;

  @override
  State<Chargement<T>> createState() => _ChargementState<T>();
}

class _ChargementState<T> extends State<Chargement<T>> {
  late Future<T> _futur = widget.charger();

  Future<void> _recharger() async {
    final f = widget.charger();
    setState(() => _futur = f);
    try {
      await f;
    } on Object {
      // L'erreur s'affiche déjà dans l'écran.
    }
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<T>(
      future: _futur,
      builder: (context, s) {
        final Widget enfant;
        if (s.hasError) {
          enfant = MessageVide(
            icone: IconeLce.wifiOff,
            titre: 'Impossible de charger',
            texte: s.error is ErreurApi ? (s.error! as ErreurApi).messageUtilisateur : 'Une erreur est survenue.',
            action: ('Réessayer', _recharger),
          );
        } else if (!s.hasData) {
          enfant = widget.squelette ?? const GrilleSquelette();
        } else {
          enfant = widget.contenu(context, s.data as T, _recharger);
        }
        return AnimatedSwitcher(duration: const Duration(milliseconds: 250), child: KeyedSubtree(key: ValueKey(s.connectionState == ConnectionState.done ? s.hasError : null), child: enfant));
      },
    );
  }
}

/// État vide ou erreur : icône, titre, explication et une action.
class MessageVide extends StatelessWidget {
  const MessageVide({super.key, required this.icone, required this.titre, required this.texte, this.action});

  final IconeLce icone;
  final String titre, texte;
  final (String, VoidCallback)? action;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(EspacesLce.e6),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(EspacesLce.e5),
              decoration: const BoxDecoration(color: CouleursLce.goldSoft, shape: BoxShape.circle),
              child: LceIcone(icone, taille: 36, couleur: CouleursLce.goldDeep),
            ),
            const SizedBox(height: EspacesLce.e4),
            Text(titre, style: TextesLce.h3, textAlign: TextAlign.center),
            const SizedBox(height: EspacesLce.e2),
            Text(texte, style: TextesLce.body.copyWith(color: CouleursLce.inkMuted), textAlign: TextAlign.center),
            if (action != null) ...[
              const SizedBox(height: EspacesLce.e5),
              LceBouton(libelle: action!.$1, onPressed: action!.$2),
            ],
          ],
        ),
      ),
    );
  }
}

/// Bloc gris qui pulse doucement, pour les squelettes.
class Bloc extends StatefulWidget {
  const Bloc({super.key, this.largeur, this.hauteur = 14, this.rayon = RayonsLce.controle});

  final double? largeur;
  final double hauteur, rayon;

  @override
  State<Bloc> createState() => _BlocState();
}

class _BlocState extends State<Bloc> with SingleTickerProviderStateMixin {
  late final _anim = AnimationController(vsync: this, duration: const Duration(milliseconds: 900))..repeat(reverse: true);

  @override
  void dispose() {
    _anim.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: Tween(begin: 0.45, end: 1.0).animate(_anim),
      child: Container(
        width: widget.largeur,
        height: widget.hauteur,
        decoration: BoxDecoration(color: CouleursLce.neutreSoft, borderRadius: BorderRadius.circular(widget.rayon)),
      ),
    );
  }
}

class GrilleSquelette extends StatelessWidget {
  const GrilleSquelette({super.key});

  @override
  Widget build(BuildContext context) {
    return GridView.count(
      physics: const NeverScrollableScrollPhysics(),
      padding: const EdgeInsets.all(MiseEnPageLce.margeMobile),
      crossAxisCount: 2,
      mainAxisSpacing: EspacesLce.e3,
      crossAxisSpacing: EspacesLce.e3,
      childAspectRatio: 0.62,
      children: List.generate(
        6,
        (_) => const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            AspectRatio(aspectRatio: 1, child: Bloc(hauteur: double.infinity, rayon: RayonsLce.carteMobile)),
            SizedBox(height: EspacesLce.e3),
            Bloc(),
            SizedBox(height: EspacesLce.e2),
            Bloc(largeur: 80),
          ],
        ),
      ),
    );
  }
}

/// Ouvre la fiche d'un produit avec une transition douce.
void ouvrirProduit(BuildContext context, String slug) {
  Navigator.of(context).push(PageRouteBuilder<void>(
    pageBuilder: (_, _, _) => EcranProduit(slug: slug),
    transitionDuration: const Duration(milliseconds: 280),
    transitionsBuilder: (_, anim, _, enfant) {
      final courbe = CurvedAnimation(parent: anim, curve: Curves.easeOutCubic);
      return FadeTransition(
        opacity: courbe,
        child: SlideTransition(position: Tween(begin: const Offset(0, 0.04), end: Offset.zero).animate(courbe), child: enfant),
      );
    },
  ));
}

/// Ajoute au panier et le confirme par un message en bas d'écran.
void ajouterAuPanier(BuildContext context, Produit p, [int quantite = 1]) {
  Etat.of(context).panier.ajouter(p.id, quantite);
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(
      behavior: SnackBarBehavior.floating,
      backgroundColor: CouleursLce.navy,
      duration: const Duration(seconds: 2),
      content: Text('« ${p.nom} » ajouté au panier', maxLines: 2, overflow: TextOverflow.ellipsis),
    ));
}

/// Carte produit reliée au panier et aux favoris.
class CarteProduit extends StatelessWidget {
  const CarteProduit(this.produit, {super.key});

  final Produit produit;

  @override
  Widget build(BuildContext context) {
    final favoris = Etat.of(context).favoris;
    return ListenableBuilder(
      listenable: favoris,
      builder: (context, _) => LceCarteProduit(
        produit: produit.carte,
        favori: favoris.contient(produit.id),
        onOuvrir: () => ouvrirProduit(context, produit.slug),
        onAjouter: produit.stock > 0 ? () => ajouterAuPanier(context, produit) : null,
        onFavori: () => favoris.basculer(produit.id),
      ),
    );
  }
}

/// Grille de produits pour un `CustomScrollView`.
class GrilleProduits extends StatelessWidget {
  const GrilleProduits(this.produits, {super.key});

  final List<Produit> produits;

  @override
  Widget build(BuildContext context) {
    final largeur = MediaQuery.sizeOf(context).width;
    final colonnes = largeur > 700 ? 4 : 2;
    final carte = (largeur - 2 * MiseEnPageLce.margeMobile - (colonnes - 1) * EspacesLce.e3) / colonnes;
    return SliverPadding(
      padding: const EdgeInsets.symmetric(horizontal: MiseEnPageLce.margeMobile),
      sliver: SliverGrid.builder(
        gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: colonnes,
          mainAxisSpacing: EspacesLce.e3,
          crossAxisSpacing: EspacesLce.e3,
          // Photo carrée (largeur de la carte) + nom sur deux lignes et prix,
          // qui grandissent avec la taille de police du téléphone.
          mainAxisExtent: carte + MediaQuery.textScalerOf(context).scale(130),
        ),
        itemCount: produits.length,
        // La carte garde sa hauteur naturelle au lieu de s'étirer sur la case.
        itemBuilder: (_, i) => Align(alignment: Alignment.topCenter, child: CarteProduit(produits[i])),
      ),
    );
  }
}

/// Titre de section, avec un lien « Voir tout » facultatif.
class TitreSection extends StatelessWidget {
  const TitreSection(this.titre, {super.key, this.surtitre, this.voirTout});

  final String titre;
  final String? surtitre;
  final VoidCallback? voirTout;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(MiseEnPageLce.margeMobile, EspacesLce.e6, EspacesLce.e2, EspacesLce.e3),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (surtitre != null) Text(surtitre!.toUpperCase(), style: TextesLce.surtitre.copyWith(color: CouleursLce.goldText)),
                Text(titre, style: TextesLce.h2),
              ],
            ),
          ),
          if (voirTout != null) TextButton(onPressed: voirTout, child: const Text('Voir tout')),
        ],
      ),
    );
  }
}

/// Bande horizontale de produits.
class BandeProduits extends StatelessWidget {
  const BandeProduits(this.produits, {super.key});

  final List<Produit> produits;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      // Photo carrée de 168 + texte, qui grandit avec la taille de police du téléphone.
      height: 168 + MediaQuery.textScalerOf(context).scale(130),
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: MiseEnPageLce.margeMobile),
        itemCount: produits.length,
        separatorBuilder: (_, _) => const SizedBox(width: EspacesLce.e3),
        itemBuilder: (_, i) => Align(alignment: Alignment.topCenter, child: SizedBox(width: 168, child: CarteProduit(produits[i]))),
      ),
    );
  }
}

/// Image réseau sur fond ivoire, sans erreur visible si elle manque.
class ImageProduit extends StatelessWidget {
  const ImageProduit(this.url, {super.key, this.ajustement = BoxFit.contain});

  final String url;
  final BoxFit ajustement;

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: CouleursLce.surfaceDouce,
      child: url.isEmpty
          ? const Center(child: LceIcone(IconeLce.sac, taille: 32, couleur: CouleursLce.line))
          : Image.network(url, fit: ajustement, errorBuilder: (_, _, _) => const SizedBox.shrink()),
    );
  }
}

/// Ligne « libellé … montant » des récapitulatifs.
class LigneMontant extends StatelessWidget {
  const LigneMontant(this.libelle, this.montant, {super.key, this.fort = false, this.texte});

  final String libelle;
  final int montant;
  final bool fort;
  final String? texte;

  @override
  Widget build(BuildContext context) {
    final style = fort ? TextesLce.h3 : TextesLce.body;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: EspacesLce.e1),
      child: Row(
        children: [
          Expanded(child: Text(libelle, style: style.copyWith(color: fort ? null : CouleursLce.inkMuted))),
          Text(texte ?? formaterFcfa(montant), style: style.copyWith(fontWeight: fort ? FontWeight.w800 : FontWeight.w600)),
        ],
      ),
    );
  }
}

/// Carte blanche arrondie.
class Carte extends StatelessWidget {
  const Carte({super.key, required this.child, this.padding = const EdgeInsets.all(EspacesLce.e4)});

  final Widget child;
  final EdgeInsets padding;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: CouleursLce.surface,
        borderRadius: BorderRadius.circular(RayonsLce.carteMobile),
        border: Border.all(color: CouleursLce.line),
      ),
      child: child,
    );
  }
}

String dateCourte(DateTime d) {
  const mois = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  final h = '${d.hour.toString().padLeft(2, '0')}h${d.minute.toString().padLeft(2, '0')}';
  return '${d.day} ${mois[d.month - 1]} ${d.year} à $h';
}
