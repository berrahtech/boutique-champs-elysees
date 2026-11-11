/// Formes renvoyées par l'API, lues depuis le JSON (voir `libs/contrats`).
library;

import 'package:lce_ui/lce_ui.dart';

import 'api.dart';

typedef Json = Map<String, dynamic>;

List<T> _liste<T>(dynamic v, T Function(Json) lire) => (v as List? ?? const []).map((e) => lire(e as Json)).toList();

IconeLce iconeDe(String? nom) => IconeLce.values.asNameMap()[nom] ?? IconeLce.divers;

class Categorie {
  Categorie.json(Json j)
      : id = j['id'] as String,
        slug = j['slug'] as String,
        nom = j['nom'] as String,
        court = (j['court'] ?? j['nom']) as String,
        icone = iconeDe(j['icone'] as String?),
        nbProduits = (j['nbProduits'] as num? ?? 0).toInt();

  final String id, slug, nom, court;
  final IconeLce icone;
  final int nbProduits;
}

class Produit {
  Produit.json(Json j)
      : id = j['id'] as String,
        slug = j['slug'] as String,
        nom = j['nom'] as String,
        categorie = ((j['categorie'] as Json?)?['nom'] ?? '') as String,
        prix = (j['prix'] as num).toInt(),
        prixBarre = (j['prixBarre'] as num?)?.toInt(),
        nouveau = j['nouveau'] == true,
        note = (j['noteMoyenne'] as num? ?? 0).toDouble(),
        nbAvis = (j['nbAvis'] as num? ?? 0).toInt(),
        stock = (j['stock'] as num? ?? 0).toInt(),
        images = _liste(j['images'], (i) => urlMedia(i['url800'] as String?)),
        vignette = urlMedia(((j['images'] as List?)?.firstOrNull as Json?)?['url400'] as String?),
        description = (j['description'] ?? '') as String,
        caracteristiques = (j['caracteristiques'] as List? ?? const [])
            .map((c) => ((c as List)[0].toString(), c[1].toString()))
            .toList();

  final String id, slug, nom, categorie, vignette, description;
  final int prix, stock, nbAvis;
  final int? prixBarre;
  final bool nouveau;
  final double note;
  final List<String> images;
  final List<(String, String)> caracteristiques;

  int get remise => prixBarre != null && prixBarre! > prix ? ((1 - prix / prixBarre!) * 100).round() : 0;

  ProduitCarte get carte =>
      ProduitCarte(id: id, nom: nom, prix: prix, prixBarre: prixBarre, nouveau: nouveau, imageUrl: vignette);
}

class Accueil {
  Accueil.json(Json j)
      : promotions = _liste(j['promotions'], Produit.json),
        nouveautes = _liste(j['nouveautes'], Produit.json),
        meilleuresVentes = _liste(j['meilleuresVentes'], Produit.json),
        populaires = _liste(j['populaires'], Produit.json),
        remiseMax = (j['remiseMax'] as num? ?? 0).toInt();

  final List<Produit> promotions, nouveautes, meilleuresVentes, populaires;
  final int remiseMax;
}

class Resultats {
  Resultats.json(Json j)
      : produits = _liste(j['produits'], Produit.json),
        total = (j['total'] as num).toInt(),
        page = (j['page'] as num).toInt(),
        pages = (j['pages'] as num).toInt();

  final List<Produit> produits;
  final int total, page, pages;
}

class Zone {
  Zone.json(Json j)
      : id = j['id'] as String,
        nom = j['nom'] as String,
        frais = (j['frais'] as num).toInt(),
        delaiHeures = (j['delaiHeures'] as num).toInt(),
        seuilGratuit = (j['seuilGratuit'] as num?)?.toInt();

  final String id, nom;
  final int frais, delaiHeures;
  final int? seuilGratuit;
}

class LigneApercu {
  LigneApercu.json(Json j)
      : produit = Produit.json(j['produit'] as Json),
        quantite = (j['quantite'] as num).toInt(),
        sousTotal = (j['sousTotal'] as num).toInt();

  final Produit produit;
  final int quantite, sousTotal;
}

/// Montants calculés par le serveur : l'appli ne fait que les afficher.
class Apercu {
  Apercu.json(Json j)
      : lignes = _liste(j['lignes'], LigneApercu.json),
        nbArticles = (j['nbArticles'] as num).toInt(),
        sousTotal = (j['sousTotal'] as num).toInt(),
        frais = (j['frais'] as num).toInt(),
        remise = (j['remise'] as num).toInt(),
        total = (j['total'] as num).toInt(),
        codeApplique = (j['codeApplique'] as Json?)?['libelle'] as String?,
        codeRefuse = j['codeRefuse'] as String?,
        ajustements = (j['ajustements'] as List? ?? const []).cast<String>();

  final List<LigneApercu> lignes;
  final int nbArticles, sousTotal, frais, remise, total;
  final String? codeApplique, codeRefuse;
  final List<String> ajustements;
}

class Adresse {
  const Adresse({required this.nom, required this.telephone, required this.quartier, required this.repere});
  Adresse.json(Json j)
      : nom = j['nom'] as String,
        telephone = j['telephone'] as String,
        quartier = j['quartier'] as String,
        repere = j['repere'] as String;

  final String nom, telephone, quartier, repere;
  Json get json => {'nom': nom, 'telephone': telephone, 'quartier': quartier, 'repere': repere};
}

class CommandeResume {
  CommandeResume.json(Json j)
      : id = j['id'] as String,
        numero = j['numero'] as String,
        statut = j['statut'] as String,
        total = (j['total'] as num).toInt(),
        nbArticles = (j['nbArticles'] as num).toInt(),
        creeLe = DateTime.parse(j['creeLe'] as String).toLocal();

  final String id, numero, statut;
  final int total, nbArticles;
  final DateTime creeLe;
}

class LigneCommande {
  LigneCommande.json(Json j)
      : libelle = j['libelle'] as String,
        quantite = (j['quantite'] as num).toInt(),
        prixUnitaire = (j['prixUnitaire'] as num).toInt(),
        image = urlMedia(j['image'] as String?);

  final String libelle, image;
  final int quantite, prixUnitaire;
}

class Etape {
  Etape.json(Json j)
      : statut = j['statut'] as String,
        date = DateTime.parse(j['date'] as String).toLocal(),
        motif = j['motif'] as String?;

  final String statut;
  final DateTime date;
  final String? motif;
}

class Commande extends CommandeResume {
  // ignore: use_super_parameters
  Commande.json(Json j)
      : lignes = _liste(j['lignes'], LigneCommande.json),
        sousTotal = (j['sousTotal'] as num).toInt(),
        fraisLivraison = (j['fraisLivraison'] as num).toInt(),
        remise = (j['remise'] as num).toInt(),
        zone = j['zone'] as String,
        delaiHeures = (j['delaiHeures'] as num).toInt(),
        adresse = Adresse.json(j['adresse'] as Json),
        historique = _liste(j['historique'], Etape.json),
        super.json(j);

  final List<LigneCommande> lignes;
  final int sousTotal, fraisLivraison, remise, delaiHeures;
  final String zone;
  final Adresse adresse;
  final List<Etape> historique;

  /// Le client peut encore annuler tant que rien n'est parti.
  bool get annulable => const {'EN_ATTENTE_PAIEMENT', 'CONFIRMEE'}.contains(statut);
}

class Profil {
  Profil.json(Json j)
      : nom = j['nom'] as String,
        telephone = j['telephone'] as String?,
        email = j['email'] as String?;

  final String nom;
  final String? telephone, email;
}
