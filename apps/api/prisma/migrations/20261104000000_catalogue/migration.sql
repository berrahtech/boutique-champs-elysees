-- Lot 1 : champs du catalogue demandés par les maquettes A-Produits et A-ProduitEdition,
-- et recherche insensible aux accents (« refrigerateur » trouve « Réfrigérateur »).

SET search_path TO lce, public;

ALTER TABLE produit
  ADD COLUMN reference        VARCHAR(40),
  ADD COLUMN rayon            VARCHAR(80)  NOT NULL DEFAULT '',  -- sous-catégorie affichée sur la carte
  ADD COLUMN publie           BOOLEAN      NOT NULL DEFAULT false,
  ADD COLUMN nb_ventes        INTEGER      NOT NULL DEFAULT 0 CHECK (nb_ventes >= 0),
  ADD COLUMN icone            VARCHAR(40),                       -- remplace la photo tant qu'il n'y en a pas
  ADD COLUMN caracteristiques JSONB        NOT NULL DEFAULT '[]'
    CHECK (jsonb_typeof(caracteristiques) = 'array');

CREATE UNIQUE INDEX ux_produit_reference ON produit (reference)
  WHERE reference IS NOT NULL AND supprime_le IS NULL;
CREATE INDEX ix_produit_publie_ventes ON produit (nb_ventes DESC) WHERE publie AND supprime_le IS NULL;

-- Retire accents et majuscules. IMMUTABLE, donc utilisable dans une colonne générée
-- (l'extension unaccent, elle, ne l'est pas).
CREATE FUNCTION sans_accents(texte text) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT AS $$
  SELECT translate(
    lower(texte),
    'àâäáãåçéèêëíìîïñóòôöõúùûüýÿœ',
    'aaaaaaceeeeiiiinooooouuuuyyo'
  );
$$;

DROP INDEX ix_produit_recherche;
ALTER TABLE produit DROP COLUMN recherche;
ALTER TABLE produit ADD COLUMN recherche TSVECTOR GENERATED ALWAYS AS (
  setweight(to_tsvector('french'::regconfig, lce.sans_accents(nom)), 'A') ||
  setweight(to_tsvector('french'::regconfig, lce.sans_accents(rayon || ' ' || coalesce(reference, ''))), 'B') ||
  setweight(to_tsvector('french'::regconfig, lce.sans_accents(description)), 'C')
) STORED;
CREATE INDEX ix_produit_recherche ON produit USING GIN (recherche);
