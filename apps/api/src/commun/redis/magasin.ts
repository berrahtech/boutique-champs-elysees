import Redis from 'ioredis';

/**
 * Magasin clé-valeur à durée de vie, juste ce dont l'identité a besoin.
 * Redis en vrai ; une version mémoire pour les tests unitaires.
 */
export abstract class Magasin {
  abstract lire(cle: string): Promise<string | null>;
  abstract ecrire(cle: string, valeur: string, dureeSecondes: number): Promise<void>;
  /** Écrit seulement si la clé n'existe pas ; renvoie false sinon. */
  abstract ecrireSiAbsent(cle: string, valeur: string, dureeSecondes: number): Promise<boolean>;
  /** Incrémente un compteur ; la durée de vie est posée au premier incrément. */
  abstract incrementer(cle: string, dureeSecondes: number): Promise<number>;
  abstract supprimer(cle: string): Promise<boolean>;
  abstract dureeRestante(cle: string): Promise<number>;
}

export class MagasinRedis extends Magasin {
  constructor(private readonly redis: Redis) {
    super();
  }

  lire(cle: string) {
    return this.redis.get(cle);
  }

  async ecrire(cle: string, valeur: string, dureeSecondes: number) {
    await this.redis.set(cle, valeur, 'EX', dureeSecondes);
  }

  async ecrireSiAbsent(cle: string, valeur: string, dureeSecondes: number) {
    return (await this.redis.set(cle, valeur, 'EX', dureeSecondes, 'NX')) === 'OK';
  }

  async incrementer(cle: string, dureeSecondes: number) {
    const [[, valeur]] = (await this.redis
      .multi()
      .incr(cle)
      .expire(cle, dureeSecondes, 'NX')
      .exec()) as [[null, number], [null, number]];
    return valeur;
  }

  async supprimer(cle: string) {
    return (await this.redis.del(cle)) > 0;
  }

  async dureeRestante(cle: string) {
    return Math.max(0, await this.redis.ttl(cle));
  }
}

export class MagasinMemoire extends Magasin {
  private readonly donnees = new Map<string, { valeur: string; expire: number }>();
  maintenant = () => Date.now();

  private entree(cle: string) {
    const e = this.donnees.get(cle);
    if (e && e.expire <= this.maintenant()) {
      this.donnees.delete(cle);
      return undefined;
    }
    return e;
  }

  async lire(cle: string) {
    return this.entree(cle)?.valeur ?? null;
  }

  async ecrire(cle: string, valeur: string, dureeSecondes: number) {
    this.donnees.set(cle, { valeur, expire: this.maintenant() + dureeSecondes * 1000 });
  }

  async ecrireSiAbsent(cle: string, valeur: string, dureeSecondes: number) {
    if (this.entree(cle)) return false;
    await this.ecrire(cle, valeur, dureeSecondes);
    return true;
  }

  async incrementer(cle: string, dureeSecondes: number) {
    const e = this.entree(cle);
    const valeur = Number(e?.valeur ?? 0) + 1;
    this.donnees.set(cle, { valeur: String(valeur), expire: e?.expire ?? this.maintenant() + dureeSecondes * 1000 });
    return valeur;
  }

  async supprimer(cle: string) {
    return this.donnees.delete(cle);
  }

  async dureeRestante(cle: string) {
    const e = this.entree(cle);
    return e ? Math.ceil((e.expire - this.maintenant()) / 1000) : 0;
  }
}
