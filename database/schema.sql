-- =============================================================================
-- Les Champs Élysées (LCE) — schéma de base de données
-- Cible : PostgreSQL 16
-- Source : onglet « Diagrammes UML » du dossier de conception (diagrammes de classes)
--
-- Conventions
--   * Tables et colonnes en snake_case, au singulier.
--   * Identifiants UUID générés par la base (gen_random_uuid, natif depuis PG 13).
--   * Montants en FCFA entiers (INTEGER) : le FCFA n'a pas de centimes.
--   * Dates en TIMESTAMPTZ (stockées en UTC, affichées en heure de Bamako).
--   * Suppression « douce » (supprime_le) pour produits et utilisateurs :
--     les commandes passées doivent rester lisibles.
--   * Les transitions de statut sont contrôlées par le serveur
--     (changerStatut) ; la base garantit seulement les valeurs possibles.
--
-- Exécution : psql -v ON_ERROR_STOP=1 -f schema.sql
-- =============================================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS lce;
SET search_path TO lce, public;

-- -----------------------------------------------------------------------------
-- 1. Énumérations
-- -----------------------------------------------------------------------------

CREATE TYPE statut_commande AS ENUM (
  'EN_ATTENTE_PAIEMENT',      -- technique, jamais affiché au client
  'CONFIRMEE',
  'EN_PREPARATION',
  'EN_ATTENTE_AFFECTATION',
  'AFFECTEE',
  'EN_COURS_LIVRAISON',
  'LIVREE',
  'ECHEC_LIVRAISON',
  'RETOUR_ENTREPOT',
  'ANNULEE'
);

CREATE TYPE statut_paiement AS ENUM (
  'EN_ATTENTE', 'REUSSI', 'ECHOUE', 'ANNULE', 'REMBOURSE', 'PARTIELLEMENT_REMBOURSE'
);

CREATE TYPE moyen_paiement AS ENUM (
  'ORANGE_MONEY', 'MOOV_MONEY', 'CARTE', 'A_LA_LIVRAISON'
);

CREATE TYPE statut_mission AS ENUM (
  'PROPOSEE', 'ACCEPTEE', 'REFUSEE', 'EN_COURS', 'LIVREE', 'ECHEC', 'RETOUR'
);

CREATE TYPE statut_caisse AS ENUM (
  'A_REVERSER', 'EN_ATTENTE_VALIDATION', 'REVERSE'
);

CREATE TYPE mode_encaissement AS ENUM (
  'ESPECES', 'ORANGE_MONEY', 'MOOV_MONEY'
);

CREATE TYPE type_mouvement AS ENUM (
  'ENTREE', 'SORTIE', 'RESERVATION', 'LIBERATION', 'REINTEGRATION', 'INVENTAIRE'
);

CREATE TYPE type_remise AS ENUM (
  'POURCENTAGE', 'MONTANT_FIXE', 'LIVRAISON_OFFERTE'
);

-- -----------------------------------------------------------------------------
-- 2. Fonctions utilitaires
-- -----------------------------------------------------------------------------

-- Met à jour maj_le à chaque modification de ligne.
CREATE FUNCTION fn_maj_le() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.maj_le := now();
  RETURN NEW;
END $$;

-- Interdit UPDATE et DELETE : tables en ajout seul (journal, historique, mouvements).
CREATE FUNCTION fn_ajout_seul() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Table % en ajout seul : % interdit', TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'insufficient_privilege';
END $$;

-- -----------------------------------------------------------------------------
-- 3. Identité et droits
-- -----------------------------------------------------------------------------

CREATE TABLE permission (
  code     VARCHAR(60)  PRIMARY KEY,          -- ex. commande.affecter
  libelle  VARCHAR(120) NOT NULL,
  module   VARCHAR(40)  NOT NULL,
  CONSTRAINT ck_permission_code CHECK (code ~ '^[a-z_]+\.[a-z_]+$')
);

CREATE TABLE role (
  id       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nom      VARCHAR(60) NOT NULL UNIQUE,
  systeme  BOOLEAN     NOT NULL DEFAULT false   -- rôle livré avec l'application, non supprimable
);

CREATE TABLE role_permission (
  role_id          UUID        NOT NULL REFERENCES role(id) ON DELETE CASCADE,
  permission_code  VARCHAR(60) NOT NULL REFERENCES permission(code) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_code)
);

CREATE TABLE utilisateur (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  telephone         VARCHAR(20)  NOT NULL,     -- format E.164, ex. +22370000000
  email             VARCHAR(254),
  nom               VARCHAR(120) NOT NULL,
  mot_de_passe_hash TEXT         NOT NULL,     -- Argon2id
  role_id           UUID         NOT NULL REFERENCES role(id),
  deux_facteurs     BOOLEAN      NOT NULL DEFAULT false,
  actif             BOOLEAN      NOT NULL DEFAULT true,
  cree_le           TIMESTAMPTZ  NOT NULL DEFAULT now(),
  maj_le            TIMESTAMPTZ  NOT NULL DEFAULT now(),
  supprime_le       TIMESTAMPTZ,
  CONSTRAINT ck_utilisateur_telephone CHECK (telephone ~ '^\+[0-9]{8,15}$')
);
-- Unicité seulement parmi les comptes non supprimés : un numéro libéré peut resservir.
CREATE UNIQUE INDEX ux_utilisateur_telephone ON utilisateur (telephone) WHERE supprime_le IS NULL;
CREATE UNIQUE INDEX ux_utilisateur_email ON utilisateur (lower(email))
  WHERE email IS NOT NULL AND supprime_le IS NULL;
CREATE INDEX ix_utilisateur_role ON utilisateur (role_id);
CREATE TRIGGER tg_utilisateur_maj BEFORE UPDATE ON utilisateur
  FOR EACH ROW EXECUTE FUNCTION fn_maj_le();

-- Jeton de rafraîchissement (30 jours). On ne stocke que l'empreinte.
CREATE TABLE jeton_rafraichissement (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  utilisateur_id  UUID        NOT NULL REFERENCES utilisateur(id) ON DELETE CASCADE,
  empreinte       CHAR(64)    NOT NULL UNIQUE,  -- SHA-256 hexadécimal
  appareil_id     UUID,
  expire_le       TIMESTAMPTZ NOT NULL,
  revoque_le      TIMESTAMPTZ,
  cree_le         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_jeton_utilisateur ON jeton_rafraichissement (utilisateur_id) WHERE revoque_le IS NULL;

CREATE TABLE appareil (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  utilisateur_id  UUID        NOT NULL REFERENCES utilisateur(id) ON DELETE CASCADE,
  plateforme      VARCHAR(10) NOT NULL CHECK (plateforme IN ('ANDROID', 'IOS', 'WEB')),
  jeton_fcm       TEXT        NOT NULL UNIQUE,
  dernier_acces   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_appareil_utilisateur ON appareil (utilisateur_id);

ALTER TABLE jeton_rafraichissement
  ADD CONSTRAINT fk_jeton_appareil FOREIGN KEY (appareil_id) REFERENCES appareil(id) ON DELETE SET NULL;

-- Journal d'audit : ajout seul, jamais modifié ni effacé.
CREATE TABLE journal_audit (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  acteur_id  UUID         REFERENCES utilisateur(id),  -- NULL = action système
  action     VARCHAR(60)  NOT NULL,                    -- ex. commande.changer_statut
  entite     VARCHAR(40)  NOT NULL,
  entite_id  UUID         NOT NULL,
  avant      JSONB,
  apres      JSONB,
  ip         INET,
  date       TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX ix_audit_entite ON journal_audit (entite, entite_id, date DESC);
CREATE INDEX ix_audit_acteur ON journal_audit (acteur_id, date DESC);
CREATE TRIGGER tg_audit_ajout_seul BEFORE UPDATE OR DELETE ON journal_audit
  FOR EACH ROW EXECUTE FUNCTION fn_ajout_seul();

-- -----------------------------------------------------------------------------
-- 4. Zones et adresses
-- -----------------------------------------------------------------------------

CREATE TABLE zone (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nom            VARCHAR(80) NOT NULL UNIQUE,   -- ex. Commune IV
  frais          INTEGER     NOT NULL CHECK (frais >= 0),
  delai_heures   INTEGER     NOT NULL CHECK (delai_heures > 0),
  seuil_gratuit  INTEGER     CHECK (seuil_gratuit >= 0),  -- NULL = jamais gratuite
  actif          BOOLEAN     NOT NULL DEFAULT true
);

CREATE TABLE adresse (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  utilisateur_id  UUID         NOT NULL REFERENCES utilisateur(id) ON DELETE CASCADE,
  zone_id         UUID         NOT NULL REFERENCES zone(id),
  libelle         VARCHAR(40)  NOT NULL,        -- ex. Maison, Bureau
  quartier        VARCHAR(80)  NOT NULL,
  repere          VARCHAR(255) NOT NULL,        -- point de repère : pas d'adresses postales à Bamako
  latitude        NUMERIC(9,6),
  longitude       NUMERIC(9,6),
  par_defaut      BOOLEAN      NOT NULL DEFAULT false
);
CREATE INDEX ix_adresse_utilisateur ON adresse (utilisateur_id);
-- Une seule adresse par défaut par utilisateur.
CREATE UNIQUE INDEX ux_adresse_defaut ON adresse (utilisateur_id) WHERE par_defaut;

-- -----------------------------------------------------------------------------
-- 5. Catalogue et stock
-- -----------------------------------------------------------------------------

CREATE TABLE categorie (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id  UUID         REFERENCES categorie(id) ON DELETE RESTRICT,
  slug       VARCHAR(80)  NOT NULL UNIQUE,
  nom        VARCHAR(80)  NOT NULL,
  ordre      INTEGER      NOT NULL DEFAULT 0,
  image_url  TEXT,
  CONSTRAINT ck_categorie_parent CHECK (parent_id IS DISTINCT FROM id)
);
CREATE INDEX ix_categorie_parent ON categorie (parent_id, ordre);

CREATE TABLE marque (
  id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nom       VARCHAR(80) NOT NULL UNIQUE,
  logo_url  TEXT
);

CREATE TABLE produit (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  categorie_id  UUID          NOT NULL REFERENCES categorie(id),
  marque_id     UUID          REFERENCES marque(id),
  slug          VARCHAR(120)  NOT NULL,
  nom           VARCHAR(160)  NOT NULL,
  description   TEXT          NOT NULL DEFAULT '',
  prix          INTEGER       NOT NULL CHECK (prix > 0),
  prix_barre    INTEGER,
  nouveau       BOOLEAN       NOT NULL DEFAULT false,
  note_moyenne  NUMERIC(2,1)  NOT NULL DEFAULT 0 CHECK (note_moyenne BETWEEN 0 AND 5),
  nb_avis       INTEGER       NOT NULL DEFAULT 0 CHECK (nb_avis >= 0),
  recherche     TSVECTOR GENERATED ALWAYS AS (
                  setweight(to_tsvector('french', nom), 'A') ||
                  setweight(to_tsvector('french', description), 'B')
                ) STORED,
  cree_le       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  maj_le        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  supprime_le   TIMESTAMPTZ,
  -- Le prix barré n'a de sens que s'il est supérieur au prix de vente.
  CONSTRAINT ck_produit_prix_barre CHECK (prix_barre IS NULL OR prix_barre > prix)
);
CREATE UNIQUE INDEX ux_produit_slug ON produit (slug) WHERE supprime_le IS NULL;
CREATE INDEX ix_produit_categorie ON produit (categorie_id) WHERE supprime_le IS NULL;
CREATE INDEX ix_produit_marque ON produit (marque_id) WHERE supprime_le IS NULL;
CREATE INDEX ix_produit_recherche ON produit USING GIN (recherche);
CREATE TRIGGER tg_produit_maj BEFORE UPDATE ON produit
  FOR EACH ROW EXECUTE FUNCTION fn_maj_le();

CREATE TABLE image_produit (
  id          UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  produit_id  UUID     NOT NULL REFERENCES produit(id) ON DELETE CASCADE,
  url_200     TEXT     NOT NULL,   -- WebP, 3 tailles servies par le CDN
  url_400     TEXT     NOT NULL,
  url_800     TEXT     NOT NULL,
  ordre       INTEGER  NOT NULL DEFAULT 0,
  UNIQUE (produit_id, ordre)
);

CREATE TABLE avis (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  produit_id   UUID        NOT NULL REFERENCES produit(id) ON DELETE CASCADE,
  client_id    UUID        NOT NULL REFERENCES utilisateur(id),
  note         SMALLINT    NOT NULL CHECK (note BETWEEN 1 AND 5),
  commentaire  TEXT        NOT NULL DEFAULT '',
  publie       BOOLEAN     NOT NULL DEFAULT false,   -- modéré avant publication
  cree_le      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (produit_id, client_id)                     -- un avis par client et par produit
);
CREATE INDEX ix_avis_produit_publie ON avis (produit_id, cree_le DESC) WHERE publie;

-- Stock séparé du produit : réserver ne verrouille jamais la fiche produit.
-- « disponible » = vendable ; « reserve » = mis de côté pour des commandes non livrées.
CREATE TABLE stock (
  produit_id    UUID     PRIMARY KEY REFERENCES produit(id) ON DELETE CASCADE,
  disponible    INTEGER  NOT NULL DEFAULT 0 CHECK (disponible >= 0),
  reserve       INTEGER  NOT NULL DEFAULT 0 CHECK (reserve >= 0),
  seuil_alerte  INTEGER  NOT NULL DEFAULT 5 CHECK (seuil_alerte >= 0),
  version       INTEGER  NOT NULL DEFAULT 0      -- verrou optimiste
);
CREATE INDEX ix_stock_alerte ON stock (produit_id) WHERE disponible <= seuil_alerte;

CREATE TABLE code_promo (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  code              VARCHAR(30)  NOT NULL,
  type              type_remise  NOT NULL,
  valeur            INTEGER      NOT NULL DEFAULT 0 CHECK (valeur >= 0),
  categorie_id      UUID         REFERENCES categorie(id),  -- cible ; NULL = tout le catalogue
  montant_minimum   INTEGER      NOT NULL DEFAULT 0 CHECK (montant_minimum >= 0),
  debut             TIMESTAMPTZ  NOT NULL,
  fin               TIMESTAMPTZ  NOT NULL,
  utilisations_max  INTEGER      CHECK (utilisations_max > 0),   -- NULL = illimité
  utilisations      INTEGER      NOT NULL DEFAULT 0 CHECK (utilisations >= 0),
  actif             BOOLEAN      NOT NULL DEFAULT true,
  CONSTRAINT ck_code_promo_periode CHECK (fin > debut),
  CONSTRAINT ck_code_promo_code CHECK (code = upper(code)),
  CONSTRAINT ck_code_promo_valeur CHECK (
    (type = 'POURCENTAGE'       AND valeur BETWEEN 1 AND 100) OR
    (type = 'MONTANT_FIXE'      AND valeur > 0) OR
    (type = 'LIVRAISON_OFFERTE' AND valeur = 0)
  ),
  CONSTRAINT ck_code_promo_plafond CHECK (utilisations_max IS NULL OR utilisations <= utilisations_max)
);
CREATE UNIQUE INDEX ux_code_promo_code ON code_promo (code);

-- -----------------------------------------------------------------------------
-- 6. Panier et favoris (synchronisés depuis le stockage local des apps)
-- -----------------------------------------------------------------------------

CREATE TABLE panier (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  utilisateur_id  UUID        NOT NULL UNIQUE REFERENCES utilisateur(id) ON DELETE CASCADE,
  code_promo      VARCHAR(30),
  maj_le          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER tg_panier_maj BEFORE UPDATE ON panier
  FOR EACH ROW EXECUTE FUNCTION fn_maj_le();

CREATE TABLE ligne_panier (
  panier_id   UUID        NOT NULL REFERENCES panier(id) ON DELETE CASCADE,
  produit_id  UUID        NOT NULL REFERENCES produit(id) ON DELETE CASCADE,
  quantite    INTEGER     NOT NULL CHECK (quantite BETWEEN 1 AND 99),
  ajoute_le   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (panier_id, produit_id)
);

CREATE TABLE favori (
  utilisateur_id  UUID        NOT NULL REFERENCES utilisateur(id) ON DELETE CASCADE,
  produit_id      UUID        NOT NULL REFERENCES produit(id) ON DELETE CASCADE,
  ajoute_le       TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (utilisateur_id, produit_id)
);

-- -----------------------------------------------------------------------------
-- 7. Commandes
-- -----------------------------------------------------------------------------

-- Numéro lisible : LCE-2026-000123
CREATE SEQUENCE seq_numero_commande;

CREATE TABLE commande (
  id               UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  numero           VARCHAR(20)      NOT NULL UNIQUE DEFAULT
                     'LCE-' || to_char(now() AT TIME ZONE 'Africa/Bamako', 'YYYY') || '-' ||
                     lpad(nextval('lce.seq_numero_commande')::text, 6, '0'),
  client_id        UUID             NOT NULL REFERENCES utilisateur(id),
  zone_id          UUID             NOT NULL REFERENCES zone(id),
  code_promo_id    UUID             REFERENCES code_promo(id),
  statut           statut_commande  NOT NULL DEFAULT 'EN_ATTENTE_PAIEMENT',
  moyen            moyen_paiement   NOT NULL,
  sous_total       INTEGER          NOT NULL CHECK (sous_total > 0),
  frais_livraison  INTEGER          NOT NULL CHECK (frais_livraison >= 0),
  remise           INTEGER          NOT NULL DEFAULT 0 CHECK (remise >= 0),
  total            INTEGER          NOT NULL CHECK (total >= 0),
  -- Adresse figée au moment de la commande (AdresseFigee) : modifier le carnet
  -- d'adresses ne change jamais une commande passée.
  adresse          JSONB            NOT NULL,
  note_client      VARCHAR(500),
  cree_le          TIMESTAMPTZ      NOT NULL DEFAULT now(),
  maj_le           TIMESTAMPTZ      NOT NULL DEFAULT now(),
  CONSTRAINT ck_commande_total CHECK (total = sous_total + frais_livraison - remise),
  CONSTRAINT ck_commande_adresse CHECK (adresse ? 'quartier' AND adresse ? 'repere' AND adresse ? 'telephone')
);
CREATE INDEX ix_commande_client ON commande (client_id, cree_le DESC);
CREATE INDEX ix_commande_statut ON commande (statut, cree_le);
CREATE INDEX ix_commande_zone_statut ON commande (zone_id, statut);
CREATE TRIGGER tg_commande_maj BEFORE UPDATE ON commande
  FOR EACH ROW EXECUTE FUNCTION fn_maj_le();

CREATE TABLE ligne_commande (
  commande_id    UUID         NOT NULL REFERENCES commande(id) ON DELETE CASCADE,
  produit_id     UUID         NOT NULL REFERENCES produit(id),
  libelle        VARCHAR(160) NOT NULL,     -- nom figé à la commande
  quantite       INTEGER      NOT NULL CHECK (quantite > 0),
  prix_unitaire  INTEGER      NOT NULL CHECK (prix_unitaire > 0),  -- prix figé à la commande
  PRIMARY KEY (commande_id, produit_id)
);
CREATE INDEX ix_ligne_commande_produit ON ligne_commande (produit_id);

CREATE TABLE historique_statut (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  commande_id  UUID             NOT NULL REFERENCES commande(id),
  de           statut_commande,           -- NULL à la création
  a            statut_commande  NOT NULL,
  acteur_id    UUID             REFERENCES utilisateur(id),   -- NULL = système (webhook, expiration)
  motif        VARCHAR(500),
  date         TIMESTAMPTZ      NOT NULL DEFAULT now(),
  CONSTRAINT ck_historique_changement CHECK (de IS DISTINCT FROM a)
);
CREATE INDEX ix_historique_commande ON historique_statut (commande_id, date);
CREATE TRIGGER tg_historique_ajout_seul BEFORE UPDATE OR DELETE ON historique_statut
  FOR EACH ROW EXECUTE FUNCTION fn_ajout_seul();
-- Les commandes ne sont jamais supprimées (annulation = statut ANNULEE).

CREATE TABLE mouvement_stock (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  produit_id   UUID            NOT NULL REFERENCES produit(id),
  commande_id  UUID            REFERENCES commande(id),
  type         type_mouvement  NOT NULL,
  quantite     INTEGER         NOT NULL CHECK (quantite <> 0),  -- signé pour INVENTAIRE
  motif        VARCHAR(255),
  acteur_id    UUID            REFERENCES utilisateur(id),
  date         TIMESTAMPTZ     NOT NULL DEFAULT now(),
  CONSTRAINT ck_mouvement_signe CHECK (type = 'INVENTAIRE' OR quantite > 0),
  -- Réservation, libération et réintégration sont toujours liées à une commande.
  CONSTRAINT ck_mouvement_commande CHECK (
    type NOT IN ('RESERVATION', 'LIBERATION', 'REINTEGRATION') OR commande_id IS NOT NULL
  )
);
CREATE INDEX ix_mouvement_produit ON mouvement_stock (produit_id, date DESC);
CREATE INDEX ix_mouvement_commande ON mouvement_stock (commande_id) WHERE commande_id IS NOT NULL;
CREATE TRIGGER tg_mouvement_ajout_seul BEFORE UPDATE OR DELETE ON mouvement_stock
  FOR EACH ROW EXECUTE FUNCTION fn_ajout_seul();

-- -----------------------------------------------------------------------------
-- 8. Paiement
-- -----------------------------------------------------------------------------

-- « Transaction » dans le diagramme de classes ; renommée pour éviter le mot réservé SQL.
CREATE TABLE transaction_paiement (
  id                 UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  commande_id        UUID             NOT NULL REFERENCES commande(id),
  moyen              moyen_paiement   NOT NULL,
  statut             statut_paiement  NOT NULL DEFAULT 'EN_ATTENTE',
  montant            INTEGER          NOT NULL CHECK (montant > 0),
  montant_rembourse  INTEGER          NOT NULL DEFAULT 0 CHECK (montant_rembourse >= 0),
  ref_prestataire    VARCHAR(100),                 -- connue après l'appel à Orange / Moov
  cle_idempotence    UUID             NOT NULL UNIQUE,
  telephone_payeur   VARCHAR(20),
  code_erreur        VARCHAR(60),
  expire_le          TIMESTAMPTZ,                  -- Mobile Money : au-delà, ECHOUE et stock libéré
  cree_le            TIMESTAMPTZ      NOT NULL DEFAULT now(),
  maj_le             TIMESTAMPTZ      NOT NULL DEFAULT now(),
  CONSTRAINT ck_transaction_rembourse CHECK (montant_rembourse <= montant),
  CONSTRAINT ck_transaction_statut_rembourse CHECK (
    (statut = 'REMBOURSE'               AND montant_rembourse = montant) OR
    (statut = 'PARTIELLEMENT_REMBOURSE' AND montant_rembourse BETWEEN 1 AND montant - 1) OR
    (statut NOT IN ('REMBOURSE', 'PARTIELLEMENT_REMBOURSE') AND montant_rembourse = 0)
  )
);
CREATE INDEX ix_transaction_commande ON transaction_paiement (commande_id);
CREATE UNIQUE INDEX ux_transaction_ref ON transaction_paiement (moyen, ref_prestataire)
  WHERE ref_prestataire IS NOT NULL;
-- Une seule transaction réussie par commande : protège contre le double débit.
CREATE UNIQUE INDEX ux_transaction_reussie ON transaction_paiement (commande_id)
  WHERE statut IN ('REUSSI', 'REMBOURSE', 'PARTIELLEMENT_REMBOURSE');
-- Balayage des paiements expirés par la tâche BullMQ.
CREATE INDEX ix_transaction_expiration ON transaction_paiement (expire_le) WHERE statut = 'EN_ATTENTE';
CREATE TRIGGER tg_transaction_maj BEFORE UPDATE ON transaction_paiement
  FOR EACH ROW EXECUTE FUNCTION fn_maj_le();

-- Webhooks reçus des opérateurs : un même événement n'est traité qu'une fois.
CREATE TABLE evenement_webhook (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  prestataire     moyen_paiement  NOT NULL,
  id_evenement    VARCHAR(100)    NOT NULL,
  transaction_id  UUID            REFERENCES transaction_paiement(id),
  charge          JSONB           NOT NULL,
  signature_ok    BOOLEAN         NOT NULL,
  recu_le         TIMESTAMPTZ     NOT NULL DEFAULT now(),
  traite_le       TIMESTAMPTZ,
  UNIQUE (prestataire, id_evenement)
);

-- -----------------------------------------------------------------------------
-- 9. Livraison et caisse livreur
-- -----------------------------------------------------------------------------

CREATE TABLE livreur (
  utilisateur_id  UUID         PRIMARY KEY REFERENCES utilisateur(id),
  disponible      BOOLEAN      NOT NULL DEFAULT false,
  latitude        NUMERIC(9,6),
  longitude       NUMERIC(9,6),
  maj_position    TIMESTAMPTZ,
  CONSTRAINT ck_livreur_position CHECK ((latitude IS NULL) = (longitude IS NULL))
);
CREATE INDEX ix_livreur_disponible ON livreur (utilisateur_id) WHERE disponible;

-- Zones couvertes par chaque livreur.
CREATE TABLE livreur_zone (
  livreur_id  UUID NOT NULL REFERENCES livreur(utilisateur_id) ON DELETE CASCADE,
  zone_id     UUID NOT NULL REFERENCES zone(id) ON DELETE CASCADE,
  PRIMARY KEY (livreur_id, zone_id)
);

CREATE TABLE mission (
  id             UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  commande_id    UUID            NOT NULL REFERENCES commande(id),
  livreur_id     UUID            NOT NULL REFERENCES livreur(utilisateur_id),
  affectee_par   UUID            NOT NULL REFERENCES utilisateur(id),
  statut         statut_mission  NOT NULL DEFAULT 'PROPOSEE',
  -- Code à 4 chiffres donné au client, stocké haché, jamais visible du livreur.
  code_hash      TEXT            NOT NULL,
  essais_code    SMALLINT        NOT NULL DEFAULT 0 CHECK (essais_code BETWEEN 0 AND 5),
  signature_url  TEXT,
  photo_url      TEXT,
  motif          VARCHAR(500),   -- refus ou échec
  affectee_le    TIMESTAMPTZ     NOT NULL DEFAULT now(),
  acceptee_le    TIMESTAMPTZ,
  livree_le      TIMESTAMPTZ,
  CONSTRAINT ck_mission_livree CHECK ((statut = 'LIVREE') = (livree_le IS NOT NULL)),
  CONSTRAINT ck_mission_motif CHECK (statut NOT IN ('REFUSEE', 'ECHEC') OR motif IS NOT NULL)
);
-- Une seule mission active par commande ; les missions refusées restent pour l'historique.
CREATE UNIQUE INDEX ux_mission_active ON mission (commande_id)
  WHERE statut IN ('PROPOSEE', 'ACCEPTEE', 'EN_COURS', 'LIVREE');
CREATE INDEX ix_mission_livreur ON mission (livreur_id, statut, affectee_le DESC);

CREATE TABLE reversement (
  id            UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  livreur_id    UUID           NOT NULL REFERENCES livreur(utilisateur_id),
  montant       INTEGER        NOT NULL CHECK (montant > 0),
  statut        statut_caisse  NOT NULL DEFAULT 'EN_ATTENTE_VALIDATION'
                  CHECK (statut <> 'A_REVERSER'),
  preuve_url    TEXT,
  declare_le    TIMESTAMPTZ    NOT NULL DEFAULT now(),
  validee_par   UUID           REFERENCES utilisateur(id),
  validee_le    TIMESTAMPTZ,
  motif_rejet   VARCHAR(500),
  CONSTRAINT ck_reversement_validation CHECK (
    (statut = 'REVERSE') = (validee_par IS NOT NULL AND validee_le IS NOT NULL)
  )
);
CREATE INDEX ix_reversement_livreur ON reversement (livreur_id, declare_le DESC);
CREATE INDEX ix_reversement_a_valider ON reversement (declare_le) WHERE statut = 'EN_ATTENTE_VALIDATION';

-- Argent reçu par le livreur à la porte (paiement à la livraison).
CREATE TABLE encaissement (
  id              UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id      UUID               NOT NULL UNIQUE REFERENCES mission(id),
  livreur_id      UUID               NOT NULL REFERENCES livreur(utilisateur_id),
  reversement_id  UUID               REFERENCES reversement(id),
  montant         INTEGER            NOT NULL CHECK (montant > 0),
  mode            mode_encaissement  NOT NULL,
  statut          statut_caisse      NOT NULL DEFAULT 'A_REVERSER',
  ref_operateur   VARCHAR(100),     -- si encaissé par Mobile Money
  encaisse_le     TIMESTAMPTZ        NOT NULL DEFAULT now(),
  -- Rattaché à un reversement dès qu'il n'est plus « à reverser ».
  CONSTRAINT ck_encaissement_reversement CHECK ((statut = 'A_REVERSER') = (reversement_id IS NULL))
);
CREATE INDEX ix_encaissement_caisse ON encaissement (livreur_id) WHERE statut = 'A_REVERSER';
CREATE INDEX ix_encaissement_reversement ON encaissement (reversement_id);

-- -----------------------------------------------------------------------------
-- 10. Vues de lecture
-- -----------------------------------------------------------------------------

-- Solde de caisse de chaque livreur (écran « Ma caisse » et tableau financier).
CREATE VIEW v_caisse_livreur AS
SELECT l.utilisateur_id AS livreur_id,
       u.nom,
       COALESCE(SUM(e.montant) FILTER (WHERE e.statut = 'A_REVERSER'), 0)            AS a_reverser,
       COALESCE(SUM(e.montant) FILTER (WHERE e.statut = 'EN_ATTENTE_VALIDATION'), 0) AS en_validation,
       MIN(e.encaisse_le)      FILTER (WHERE e.statut = 'A_REVERSER')                AS plus_ancien
FROM livreur l
JOIN utilisateur u ON u.id = l.utilisateur_id
LEFT JOIN encaissement e ON e.livreur_id = l.utilisateur_id
GROUP BY l.utilisateur_id, u.nom;

-- Produits sous le seuil d'alerte (tableau de bord stock).
CREATE VIEW v_stock_alerte AS
SELECT p.id, p.nom, s.disponible, s.reserve, s.seuil_alerte
FROM stock s
JOIN produit p ON p.id = s.produit_id
WHERE p.supprime_le IS NULL AND s.disponible <= s.seuil_alerte;

-- -----------------------------------------------------------------------------
-- 11. Données de référence : permissions et rôles système
--     (liste de départ, à compléter avec l'écran « Rôles et permissions »)
-- -----------------------------------------------------------------------------

INSERT INTO permission (code, libelle, module) VALUES
  ('commande.voir',          'Voir les commandes',               'commande'),
  ('commande.changer_statut','Changer le statut d''une commande','commande'),
  ('commande.affecter',      'Affecter un livreur',              'commande'),
  ('commande.annuler',       'Annuler une commande',             'commande'),
  ('commande.rembourser',    'Rembourser un paiement',           'commande'),
  ('produit.voir',           'Voir le catalogue',                'produit'),
  ('produit.modifier',       'Créer et modifier les produits',   'produit'),
  ('stock.ajuster',          'Ajuster le stock',                 'stock'),
  ('promo.gerer',            'Gérer les codes promo',            'promo'),
  ('avis.moderer',           'Modérer les avis',                 'avis'),
  ('client.voir',            'Voir les clients',                 'client'),
  ('livreur.gerer',          'Gérer les livreurs et les zones',  'livraison'),
  ('caisse.valider',         'Valider les reversements',         'caisse'),
  ('rapport.voir',           'Voir les rapports',                'rapport'),
  ('utilisateur.gerer',      'Gérer le personnel',               'utilisateur'),
  ('role.gerer',             'Gérer les rôles et permissions',   'utilisateur'),
  ('audit.voir',             'Consulter le journal d''audit',    'utilisateur');

INSERT INTO role (nom, systeme) VALUES
  ('Client', true),
  ('Livreur', true),
  ('Administrateur', true),
  ('Gestionnaire commandes', true),
  ('Gestionnaire catalogue', true),
  ('Responsable financier', true);

-- Administrateur : toutes les permissions.
INSERT INTO role_permission (role_id, permission_code)
SELECT r.id, p.code FROM role r CROSS JOIN permission p WHERE r.nom = 'Administrateur';

INSERT INTO role_permission (role_id, permission_code)
SELECT r.id, v.code
FROM role r
JOIN (VALUES
  ('Gestionnaire commandes', 'commande.voir'),
  ('Gestionnaire commandes', 'commande.changer_statut'),
  ('Gestionnaire commandes', 'commande.affecter'),
  ('Gestionnaire commandes', 'commande.annuler'),
  ('Gestionnaire commandes', 'client.voir'),
  ('Gestionnaire commandes', 'produit.voir'),
  ('Gestionnaire catalogue', 'produit.voir'),
  ('Gestionnaire catalogue', 'produit.modifier'),
  ('Gestionnaire catalogue', 'stock.ajuster'),
  ('Gestionnaire catalogue', 'promo.gerer'),
  ('Gestionnaire catalogue', 'avis.moderer'),
  ('Responsable financier',  'commande.voir'),
  ('Responsable financier',  'commande.rembourser'),
  ('Responsable financier',  'caisse.valider'),
  ('Responsable financier',  'rapport.voir')
) AS v(role, code) ON v.role = r.nom;

COMMIT;
