import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../app/app.module';
import { configurerApplication } from '../application';
import { PrismaService } from '../commun/prisma/prisma.service';
import { Magasin } from '../commun/redis/magasin';
import { MessageEmail, PasserelleEmail } from './email/passerelle-email';
import { IdentiteGoogle, VerificateurGoogle } from './google/verificateur-google';
import { PasserelleSms } from './sms/passerelle-sms';

/**
 * Tests d'intégration : vraie API, vrai PostgreSQL, vrai Redis (docker compose up -d).
 * Seuls les envois de SMS et d'e-mails et la vérification Google sont simulés.
 * Lancement : npx nx run api:e2e
 */
const sms: { telephone: string; message: string }[] = [];
const emails: MessageEmail[] = [];
const identitesGoogle = new Map<string, IdentiteGoogle>();

const graine = Date.now().toString().slice(-6);
const numero = (i: number) => `6${i}${graine}`;
const adresse = (nom: string) => `${nom}.${graine}@exemple.ml`;
const MOT_DE_PASSE = 'essai-integration-1';

describe('API (intégration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwt: JwtService;
  let magasin: Magasin;
  const api = () => request(app.getHttpServer());

  /** Le délai de 60 s entre deux envois est testé à part : on l'efface pour enchaîner les étapes. */
  const sansDelai = (identifiant: string) => magasin.supprimer(`otp:delai:${identifiant}`);
  const dernierCode = (texte?: string) => texte?.match(/\d{6}/)?.[0] ?? '';

  async function inscrireParEmail(email: string, nom = 'Awa Email') {
    await api().post('/api/v1/auth/otp').send({ identifiant: email, objet: 'INSCRIPTION' }).expect(202);
    const code = dernierCode(emails.at(-1)?.texte);
    const verif = await api().post('/api/v1/auth/otp/verifier').send({ identifiant: email, objet: 'INSCRIPTION', code }).expect(200);
    return api().post('/api/v1/auth/inscription').send({ preuveOtp: verif.body.preuveOtp, nom, motDePasse: MOT_DE_PASSE }).expect(201);
  }

  const jetonAdmin = (permissions: string[]) =>
    jwt.signAsync({ sub: '00000000-0000-0000-0000-000000000000', role: 'Test', permissions }, { expiresIn: 300 });

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PasserelleSms)
      .useValue({ envoyer: async (telephone: string, message: string) => void sms.push({ telephone, message }) })
      .overrideProvider(PasserelleEmail)
      .useValue({ envoyer: async (m: MessageEmail) => void emails.push(m) })
      .overrideProvider(VerificateurGoogle)
      .useValue({ clientId: 'client-test', verifier: async (j: string) => identitesGoogle.get(j) ?? null })
      .compile();
    app = configurerApplication(module.createNestApplication<NestExpressApplication>());
    await app.init();
    prisma = app.get(PrismaService);
    jwt = app.get(JwtService);
    magasin = app.get(Magasin);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('inscription et connexion par e-mail', () => {
    it('crée un compte sans téléphone, avec l’adresse vérifiée', async () => {
      const email = adresse('inscription');
      const r = await inscrireParEmail(email);
      const moi = await api().get('/api/v1/moi').set('Authorization', `Bearer ${r.body.jetonAcces}`).expect(200);
      expect(moi.body).toMatchObject({ email, telephone: null, role: 'Client' });
      const compte = await prisma.utilisateur.findFirstOrThrow({ where: { email } });
      expect(compte.emailVerifieLe).not.toBeNull();
    });

    it('se connecte ensuite avec l’adresse, en majuscules ou non', async () => {
      const email = adresse('connexion');
      await inscrireParEmail(email);
      await api().post('/api/v1/auth/connexion').send({ identifiant: email.toUpperCase(), motDePasse: MOT_DE_PASSE }).expect(200);
      const r = await api().post('/api/v1/auth/connexion').send({ identifiant: email, motDePasse: 'mauvais-mot-1' }).expect(401);
      expect(r.body.type).toBe('/problemes/identifiants-invalides');
    });

    it('refuse une deuxième inscription avec la même adresse', async () => {
      const email = adresse('doublon');
      await inscrireParEmail(email);
      const r = await api().post('/api/v1/auth/otp').send({ identifiant: email, objet: 'INSCRIPTION' }).expect(409);
      expect(r.body.type).toBe('/problemes/compte-existant');
    });

    it('change le mot de passe avec un code reçu par e-mail', async () => {
      const email = adresse('oubli');
      await inscrireParEmail(email);
      await sansDelai(email);
      await api().post('/api/v1/auth/otp').send({ identifiant: email, objet: 'MOT_DE_PASSE' }).expect(202);
      const code = dernierCode(emails.at(-1)?.texte);
      const v = await api().post('/api/v1/auth/otp/verifier').send({ identifiant: email, objet: 'MOT_DE_PASSE', code }).expect(200);
      await api().post('/api/v1/auth/mot-de-passe/reinitialiser').send({ preuveOtp: v.body.preuveOtp, motDePasse: 'nouveau-mot-2' }).expect(204);
      await api().post('/api/v1/auth/connexion').send({ identifiant: email, motDePasse: 'nouveau-mot-2' }).expect(200);
    });

    it('une adresse déclarée sans vérification n’ouvre ni connexion ni changement de mot de passe', async () => {
      const email = adresse('declaree');
      const telephone = numero(1);
      await api().post('/api/v1/auth/otp').send({ identifiant: telephone, objet: 'INSCRIPTION' }).expect(202);
      const code = dernierCode(sms.at(-1)?.message);
      const v = await api().post('/api/v1/auth/otp/verifier').send({ identifiant: telephone, objet: 'INSCRIPTION', code }).expect(200);
      await api().post('/api/v1/auth/inscription').send({ preuveOtp: v.body.preuveOtp, nom: 'Compte Tel', motDePasse: MOT_DE_PASSE, email }).expect(201);

      await api().post('/api/v1/auth/connexion').send({ identifiant: email, motDePasse: MOT_DE_PASSE }).expect(401);
      const avant = emails.length;
      await api().post('/api/v1/auth/otp').send({ identifiant: email, objet: 'MOT_DE_PASSE' }).expect(202);
      expect(emails.length).toBe(avant);
    });
  });

  describe('connexion avec Google', () => {
    const google = (jeton: string, id: IdentiteGoogle) => {
      identitesGoogle.set(jeton, id);
      return api().post('/api/v1/auth/google').send({ jeton });
    };

    it('crée le compte à la première connexion, sans mot de passe ni téléphone', async () => {
      const email = adresse('google');
      const r = await google('j1', { id: `g-${graine}-1`, email, emailVerifie: true, nom: 'Fanta Google' }).expect(200);
      const moi = await api().get('/api/v1/moi').set('Authorization', `Bearer ${r.body.jetonAcces}`).expect(200);
      expect(moi.body).toMatchObject({ nom: 'Fanta Google', email, telephone: null, role: 'Client' });
      // Pas de connexion par mot de passe sur un compte qui n'en a pas.
      await api().post('/api/v1/auth/connexion').send({ identifiant: email, motDePasse: MOT_DE_PASSE }).expect(401);
    });

    it('retrouve le même compte à la connexion suivante', async () => {
      const id = { id: `g-${graine}-2`, email: adresse('google2'), emailVerifie: true, nom: 'Deux Fois' };
      await google('j2', id).expect(200);
      await google('j2', id).expect(200);
      expect(await prisma.utilisateur.count({ where: { googleId: id.id } })).toBe(1);
    });

    it('rattache un compte dont l’adresse est déjà vérifiée', async () => {
      const email = adresse('rattache');
      await inscrireParEmail(email);
      await google('j3', { id: `g-${graine}-3`, email, emailVerifie: true, nom: 'X' }).expect(200);
      const compte = await prisma.utilisateur.findFirstOrThrow({ where: { email } });
      expect(compte.googleId).toBe(`g-${graine}-3`);
      expect(compte.nom).toBe('Awa Email');
    });

    it('ne donne pas accès à un compte qui avait seulement déclaré l’adresse', async () => {
      const email = adresse('usurpee');
      const telephone = numero(2);
      await api().post('/api/v1/auth/otp').send({ identifiant: telephone, objet: 'INSCRIPTION' }).expect(202);
      const code = dernierCode(sms.at(-1)?.message);
      const v = await api().post('/api/v1/auth/otp/verifier').send({ identifiant: telephone, objet: 'INSCRIPTION', code }).expect(200);
      await api().post('/api/v1/auth/inscription').send({ preuveOtp: v.body.preuveOtp, nom: 'Usurpateur', motDePasse: MOT_DE_PASSE, email }).expect(201);

      const r = await google('j4', { id: `g-${graine}-4`, email, emailVerifie: true, nom: 'Vraie Personne' }).expect(200);
      const moi = await api().get('/api/v1/moi').set('Authorization', `Bearer ${r.body.jetonAcces}`).expect(200);
      expect(moi.body.nom).toBe('Vraie Personne');
      const ancien = await prisma.utilisateur.findFirstOrThrow({ where: { telephone: `+223${telephone}` } });
      expect(ancien.email).toBeNull();
    });

    it('refuse une adresse Google non vérifiée et un jeton invalide', async () => {
      const r = await google('j5', { id: `g-${graine}-5`, email: adresse('nv'), emailVerifie: false, nom: null }).expect(400);
      expect(r.body.type).toBe('/problemes/google-email-non-verifie');
      await api().post('/api/v1/auth/google').send({ jeton: 'inconnu' }).expect(401);
    });

    it('ne contourne pas la double authentification du personnel', async () => {
      const email = adresse('personnel');
      await inscrireParEmail(email);
      await prisma.utilisateur.updateMany({ where: { email }, data: { deuxFacteurs: true } });
      const r = await google('j6', { id: `g-${graine}-6`, email, emailVerifie: true, nom: null }).expect(403);
      expect(r.body.type).toBe('/problemes/google-non-autorise');
    });

    it('annonce l’identifiant client à l’interface', async () => {
      const r = await api().get('/api/v1/auth/options').expect(200);
      expect(r.body.googleClientId).toBe('client-test');
    });
  });

  describe('double authentification', () => {
    it('envoie le code au téléphone et à l’e-mail vérifié, puis l’exige', async () => {
      const email = adresse('deuxfacteurs');
      await inscrireParEmail(email);
      await prisma.utilisateur.updateMany({ where: { email }, data: { deuxFacteurs: true, telephone: `+223${numero(3)}` } });
      await sansDelai(email);

      const r = await api().post('/api/v1/auth/connexion').send({ identifiant: email, motDePasse: MOT_DE_PASSE }).expect(401);
      expect(r.body.type).toBe('/problemes/otp-requis');
      const code = dernierCode(emails.at(-1)?.texte);
      expect(dernierCode(sms.at(-1)?.message)).toBe(code);
      await api().post('/api/v1/auth/connexion').send({ identifiant: email, motDePasse: MOT_DE_PASSE, code }).expect(200);
    });

    it('redemande le code déjà envoyé au lieu de bloquer un nouvel essai', async () => {
      const email = adresse('deuxfacteurs-reessai');
      await inscrireParEmail(email);
      await prisma.utilisateur.updateMany({ where: { email }, data: { deuxFacteurs: true } });
      await sansDelai(email);

      await api().post('/api/v1/auth/connexion').send({ identifiant: email, motDePasse: MOT_DE_PASSE }).expect(401);
      const code = dernierCode(emails.at(-1)?.texte);
      const envois = emails.length;
      const r = await api().post('/api/v1/auth/connexion').send({ identifiant: email, motDePasse: MOT_DE_PASSE }).expect(401);
      expect(r.body.type).toBe('/problemes/otp-requis');
      expect(emails).toHaveLength(envois);
      await api().post('/api/v1/auth/connexion').send({ identifiant: email, motDePasse: MOT_DE_PASSE, code }).expect(200);
    });
  });

  describe('délai entre deux envois', () => {
    it('refuse un deuxième code dans la minute', async () => {
      const email = adresse('delai');
      await api().post('/api/v1/auth/otp').send({ identifiant: email, objet: 'INSCRIPTION' }).expect(202);
      const r = await api().post('/api/v1/auth/otp').send({ identifiant: email, objet: 'INSCRIPTION' }).expect(429);
      expect(r.body.type).toBe('/problemes/trop-de-tentatives');
    });
  });

  describe('catalogue public', () => {
    it('cherche sans accents et ne montre pas les brouillons', async () => {
      const r = await api().get('/api/v1/produits').query({ q: 'refrigerateur' }).expect(200);
      expect(r.body.produits.map((p: { nom: string }) => p.nom)).toContain('Réfrigérateur 2 portes 260 L');
      const brouillons = await prisma.produit.findMany({ where: { publie: false, supprimeLe: null }, select: { slug: true } });
      for (const b of brouillons) await api().get(`/api/v1/produits/${b.slug}`).expect(404);
    });

    it('calcule le panier côté serveur : prix réel, stock, code promo', async () => {
      const { body } = await api().get('/api/v1/produits').query({ q: 'cabas' }).expect(200);
      const produit = body.produits[0];
      const r = await api()
        .post('/api/v1/panier/apercu')
        .send({ lignes: [{ produitId: produit.id, quantite: 1 }], codePromo: 'bienvenue10' })
        .expect(201);
      expect(r.body.sousTotal).toBe(produit.prix);
      expect(r.body.remise).toBe(Math.round(produit.prix / 10));
      expect(r.body.total).toBe(r.body.sousTotal + r.body.frais - r.body.remise);
    });
  });

  describe('administration', () => {
    it('exige une connexion puis la bonne permission', async () => {
      await api().get('/api/v1/admin/produits').expect(401);
      const sansDroit = await jetonAdmin(['commande.voir']);
      const r = await api().get('/api/v1/admin/produits').set('Authorization', `Bearer ${sansDroit}`).expect(403);
      expect(r.body.permission).toBe('produit.voir');
      const lecture = await jetonAdmin(['produit.voir']);
      await api().get('/api/v1/admin/produits').set('Authorization', `Bearer ${lecture}`).expect(200);
      await api()
        .post('/api/v1/admin/produits')
        .set('Authorization', `Bearer ${lecture}`)
        .send({ nom: 'Interdit', categorieId: '00000000-0000-0000-0000-000000000000', prix: 100 })
        .expect(403);
    });

    it('un client connecté n’a pas accès à l’administration', async () => {
      const r = await inscrireParEmail(adresse('client'));
      await api().get('/api/v1/admin/stocks').set('Authorization', `Bearer ${r.body.jetonAcces}`).expect(403);
    });
  });
});
