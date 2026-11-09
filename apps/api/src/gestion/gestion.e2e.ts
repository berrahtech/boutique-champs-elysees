import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../app/app.module';
import { configurerApplication } from '../application';
import { PrismaService } from '../commun/prisma/prisma.service';
import { PasserelleEmail } from '../identite/email/passerelle-email';
import { PasserelleSms } from '../identite/sms/passerelle-sms';

/** Zones, codes promo, personnel et rôles, sur la vraie base. Tout ce qui est créé est retiré à la fin. */
const graine = Date.now().toString().slice(-6);

describe('Gestion (intégration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jeton: string;
  let adminId: string;
  const creees = { zones: [] as string[], codes: [] as string[], roles: [] as string[], comptes: [] as string[] };
  const api = () => request(app.getHttpServer());
  const avec = (r: request.Test) => r.set('Authorization', `Bearer ${jeton}`);

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PasserelleSms)
      .useValue({ envoyer: async () => undefined })
      .overrideProvider(PasserelleEmail)
      .useValue({ envoyer: async () => undefined })
      .compile();
    app = configurerApplication(module.createNestApplication<NestExpressApplication>());
    await app.init();
    prisma = app.get(PrismaService);
    const [role, permissions] = await Promise.all([
      prisma.role.findUniqueOrThrow({ where: { nom: 'Administrateur' } }),
      prisma.permission.findMany({ select: { code: true } }),
    ]);
    const admin = await prisma.utilisateur.create({ data: { nom: 'Admin Gestion', telephone: `+2235${graine}1`, roleId: role.id } });
    adminId = admin.id;
    creees.comptes.push(admin.id);
    jeton = await app.get(JwtService).signAsync({ sub: admin.id, role: 'Administrateur', permissions: permissions.map((p) => p.code) }, { expiresIn: 600 });
  });

  afterAll(async () => {
    await prisma.zone.updateMany({ where: { id: { in: creees.zones } }, data: { actif: false } });
    await prisma.codePromo.deleteMany({ where: { id: { in: creees.codes } } });
    await prisma.utilisateur.updateMany({ where: { id: { in: creees.comptes } }, data: { actif: false, supprimeLe: new Date() } });
    await prisma.role.deleteMany({ where: { id: { in: creees.roles }, utilisateurs: { none: {} } } });
    await app.close();
  });

  it('crée et modifie une zone, refuse un nom en double', async () => {
    const zone = { nom: `Zone gestion ${graine}`, frais: 2_000, delaiHeures: 48, seuilGratuit: 50_000, actif: true };
    const creees_ = await avec(api().post('/api/v1/admin/zones')).send(zone).expect(201);
    const z = creees_.body.find((x: { nom: string }) => x.nom === zone.nom);
    creees.zones.push(z.id);
    expect((await avec(api().post('/api/v1/admin/zones')).send(zone).expect(409)).body.type).toBe('/problemes/zone-existante');
    const apres = await avec(api().patch(`/api/v1/admin/zones/${z.id}`)).send({ ...zone, frais: 2_500, actif: false }).expect(200);
    expect(apres.body.find((x: { id: string }) => x.id === z.id)).toMatchObject({ frais: 2_500, actif: false });
    // Suspendue : elle n'est plus proposée aux clients.
    const publiques = await api().get('/api/v1/zones').expect(200);
    expect(publiques.body.some((x: { id: string }) => x.id === z.id)).toBe(false);
  });

  it('crée un code promo que le panier applique', async () => {
    const code = `TEST${graine}`;
    const debut = new Date(Date.now() - 86_400_000).toISOString();
    const fin = new Date(Date.now() + 86_400_000).toISOString();
    const corps = { code: code.toLowerCase(), type: 'POURCENTAGE', valeur: 20, categorieId: null, montantMinimum: 0, debut, fin, utilisationsMax: 5, actif: true };
    expect((await avec(api().post('/api/v1/admin/promos')).send({ ...corps, valeur: 150 }).expect(400)).body.type).toBe('/problemes/valeur-invalide');
    const liste = await avec(api().post('/api/v1/admin/promos')).send(corps).expect(201);
    const c = liste.body.find((x: { code: string }) => x.code === code);
    creees.codes.push(c.id);
    expect(c.etat).toBe('actif');

    const produit = await prisma.produit.findFirstOrThrow({ where: { publie: true, supprimeLe: null, stock: { disponible: { gt: 0 } } } });
    const apercu = await api().post('/api/v1/panier/apercu').send({ lignes: [{ produitId: produit.id, quantite: 1 }], codePromo: code }).expect(201);
    expect(apercu.body.remise).toBe(Math.round(produit.prix * 0.2));

    await avec(api().patch(`/api/v1/admin/promos/${c.id}`)).send({ ...corps, actif: false }).expect(200);
    const refuse = await api().post('/api/v1/panier/apercu').send({ lignes: [{ produitId: produit.id, quantite: 1 }], codePromo: code }).expect(201);
    expect(refuse.body.remise).toBe(0);
    expect(refuse.body.codeRefuse).toBeTruthy();
  });

  it('gère le personnel et protège son propre compte', async () => {
    const vue = await avec(api().get('/api/v1/admin/personnel')).expect(200);
    const stock = vue.body.roles.find((r: { nom: string }) => r.nom === 'Gestionnaire de stock');
    expect(vue.body.roles.some((r: { nom: string }) => r.nom === 'Client')).toBe(false);

    const faible = await avec(api().post('/api/v1/admin/personnel'))
      .send({ nom: 'Membre Test', telephone: `5${graine}2`, roleId: stock.id, motDePasse: 'court' })
      .expect(400);
    expect(faible.body.type).toBe('/problemes/donnees-invalides');
    const apres = await avec(api().post('/api/v1/admin/personnel'))
      .send({ nom: 'Membre Test', telephone: `5${graine}2`, roleId: stock.id, motDePasse: 'motdepasse-test-1' })
      .expect(201);
    const membre = apres.body.membres.find((m: { nom: string }) => m.nom === 'Membre Test');
    creees.comptes.push(membre.id);
    const compte = await prisma.utilisateur.findUniqueOrThrow({ where: { id: membre.id } });
    expect(compte.deuxFacteurs).toBe(true);

    await avec(api().patch(`/api/v1/admin/personnel/${membre.id}`)).send({ nom: 'Membre Test', roleId: stock.id, actif: false }).expect(200);
    const soi = await avec(api().patch(`/api/v1/admin/personnel/${adminId}`)).send({ nom: 'Admin Gestion', roleId: compte.roleId, actif: false }).expect(409);
    expect(soi.body.type).toBe('/problemes/modification-soi');
  });

  it('crée, modifie et supprime un rôle ; les rôles réservés ne bougent pas', async () => {
    const roles = await avec(api().post('/api/v1/admin/roles')).send({ nom: `Préparateur ${graine}`, permissions: ['tableau.voir', 'commande.voir'] }).expect(201);
    const role = roles.body.find((r: { nom: string }) => r.nom === `Préparateur ${graine}`);
    creees.roles.push(role.id);
    expect(role.permissions.sort()).toEqual(['commande.voir', 'tableau.voir']);

    const modifie = await avec(api().patch(`/api/v1/admin/roles/${role.id}`)).send({ nom: role.nom, permissions: ['tableau.voir', 'commande.changer_statut'] }).expect(200);
    expect(modifie.body.find((r: { id: string }) => r.id === role.id).permissions.sort()).toEqual(['commande.changer_statut', 'tableau.voir']);
    await avec(api().patch(`/api/v1/admin/roles/${role.id}`)).send({ nom: role.nom, permissions: ['inconnue.permission'] }).expect(400);

    const admin = roles.body.find((r: { nom: string }) => r.nom === 'Administrateur');
    expect((await avec(api().patch(`/api/v1/admin/roles/${admin.id}`)).send({ nom: 'Administrateur', permissions: [] }).expect(409)).body.type).toBe('/problemes/role-verrouille');

    await avec(api().delete(`/api/v1/admin/roles/${role.id}`)).expect(204);
  });

  it('liste les clients et peut désactiver un compte', async () => {
    const roleClient = await prisma.role.findUniqueOrThrow({ where: { nom: 'Client' } });
    const client = await prisma.utilisateur.create({ data: { nom: `Cliente Gestion ${graine}`, telephone: `+2235${graine}3`, roleId: roleClient.id } });
    creees.comptes.push(client.id);
    const liste = await avec(api().get('/api/v1/admin/clients')).query({ q: `Gestion ${graine}` }).expect(200);
    expect(liste.body.clients.map((c: { id: string }) => c.id)).toEqual([client.id]);
    const fiche = await avec(api().patch(`/api/v1/admin/clients/${client.id}`)).send({ actif: false }).expect(200);
    expect(fiche.body.actif).toBe(false);
  });
});
