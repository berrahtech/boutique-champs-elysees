-- Inscription par e-mail ou avec Google : le téléphone et le mot de passe deviennent
-- facultatifs. Un compte garde au moins un moyen d'être joint.

SET search_path TO lce, public;

ALTER TABLE utilisateur
  ALTER COLUMN telephone DROP NOT NULL,
  ALTER COLUMN mot_de_passe_hash DROP NOT NULL,
  ADD COLUMN email_verifie_le TIMESTAMPTZ,
  ADD COLUMN google_id VARCHAR(64),
  ADD CONSTRAINT ck_utilisateur_contact CHECK (telephone IS NOT NULL OR email IS NOT NULL),
  -- Une adresse ne peut être vérifiée que si elle existe.
  ADD CONSTRAINT ck_utilisateur_email_verifie CHECK (email_verifie_le IS NULL OR email IS NOT NULL);

CREATE UNIQUE INDEX ux_utilisateur_google ON utilisateur (google_id)
  WHERE google_id IS NOT NULL AND supprime_le IS NULL;
