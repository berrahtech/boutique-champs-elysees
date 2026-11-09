import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import type { ActionCommande, ModeEncaissement, MoyenPaiement, StatutCommande } from '@lce/contrats';
import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Length, Matches, MaxLength, Min, ValidateNested } from 'class-validator';
import { Permission, UtilisateurCourant } from '../identite/gardes';
import type { JetonAcces } from '../identite/jetons.service';
import { normaliserTelephone } from '../identite/telephone';
import { PanierDto } from '../panier/panier.controller';
import { CommandesService } from './commandes.service';

const STATUTS: StatutCommande[] = [
  'EN_ATTENTE_PAIEMENT',
  'CONFIRMEE',
  'EN_PREPARATION',
  'EN_ATTENTE_AFFECTATION',
  'AFFECTEE',
  'EN_COURS_LIVRAISON',
  'LIVREE',
  'ECHEC_LIVRAISON',
  'RETOUR_ENTREPOT',
  'ANNULEE',
];
const ACTIONS: ActionCommande[] = ['preparer', 'prete', 'affecter', 'expedier', 'livrer', 'echec', 'relivrer', 'retour', 'annuler'];

class AdresseDto {
  @IsString() @Length(2, 120, { message: 'nom : entre 2 et 120 caractères' })
  nom!: string;

  @Transform(({ value }) => (typeof value === 'string' ? (normaliserTelephone(value) ?? '') : ''))
  @Matches(/^\+223\d{8}$/, { message: 'telephone : numéro malien à 8 chiffres attendu' })
  telephone!: string;

  @IsString() @Length(2, 80, { message: 'quartier : entre 2 et 80 caractères' })
  quartier!: string;

  @IsString() @Length(3, 255, { message: 'repere : décrivez un point de repère (3 caractères au moins)' })
  repere!: string;
}

export class CreationCommandeDto extends PanierDto {
  @IsUUID('all', { message: 'zoneId : choisissez une zone de livraison' })
  zoneId!: string;

  @ValidateNested() @Type(() => AdresseDto)
  adresse!: AdresseDto;

  @IsOptional() @IsString() @MaxLength(500, { message: 'note : 500 caractères au plus' })
  note?: string | null;

  @IsIn(['ORANGE_MONEY', 'MOOV_MONEY', 'CARTE', 'A_LA_LIVRAISON'], { message: 'moyen : moyen de paiement inconnu' })
  moyen!: MoyenPaiement;
}

class CriteresCommandesDto {
  @IsOptional() @IsIn([...STATUTS, 'a-traiter'])
  statut?: StatutCommande | 'a-traiter';

  @IsOptional() @IsString() @MaxLength(80)
  q?: string;

  @IsOptional() @IsUUID()
  clientId?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number;
}

class ActionCommandeDto {
  @IsIn(ACTIONS, { message: 'action : action inconnue' })
  action!: ActionCommande;

  @IsOptional() @IsString() @MaxLength(500)
  motif?: string;

  @IsOptional() @IsUUID()
  livreurId?: string;

  @IsOptional() @IsIn(['ESPECES', 'ORANGE_MONEY', 'MOOV_MONEY'])
  mode?: ModeEncaissement;
}

/** Commandes du client connecté. */
@Controller('commandes')
export class CommandesController {
  constructor(private readonly service: CommandesService) {}

  @Post()
  creer(@Body() corps: CreationCommandeDto, @UtilisateurCourant() jeton: JetonAcces) {
    return this.service.creer(jeton.sub, corps);
  }

  @Get()
  lister(@UtilisateurCourant() jeton: JetonAcces) {
    return this.service.listerClient(jeton.sub);
  }

  @Get('preremplissage')
  preremplissage(@UtilisateurCourant() jeton: JetonAcces) {
    return this.service.preremplissage(jeton.sub);
  }

  @Get(':numero')
  lire(@Param('numero') numero: string, @UtilisateurCourant() jeton: JetonAcces) {
    return this.service.lireClient(jeton.sub, numero);
  }

  @Post(':numero/annulation')
  @HttpCode(HttpStatus.OK)
  annuler(@Param('numero') numero: string, @UtilisateurCourant() jeton: JetonAcces) {
    return this.service.annulerParClient(jeton.sub, numero);
  }
}

/** Suivi et traitement des commandes par l'équipe. */
@Controller('admin')
export class AdminCommandesController {
  constructor(private readonly service: CommandesService) {}

  @Get('commandes')
  @Permission('commande.voir')
  lister(@Query() criteres: CriteresCommandesDto) {
    return this.service.listerAdmin(criteres);
  }

  @Get('commandes/:id')
  @Permission('commande.voir')
  lire(@Param('id', ParseUUIDPipe) id: string, @UtilisateurCourant() jeton: JetonAcces) {
    return this.service.lireAdmin(id, jeton.permissions);
  }

  /** La permission propre à chaque action est vérifiée par le service. */
  @Post('commandes/:id/actions')
  @Permission('commande.voir')
  @HttpCode(HttpStatus.OK)
  agir(@Param('id', ParseUUIDPipe) id: string, @Body() corps: ActionCommandeDto, @UtilisateurCourant() jeton: JetonAcces) {
    return this.service.agir(id, corps, jeton);
  }

  @Get('ventes/resume')
  @Permission('commande.voir')
  resume() {
    return this.service.resumeVentes();
  }
}
