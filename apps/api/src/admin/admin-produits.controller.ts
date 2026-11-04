import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PartialType } from '@nestjs/mapped-types';
import type { EtatStock } from '@lce/contrats';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  Min,
} from 'class-validator';
import { Probleme } from '../commun/erreurs/probleme';
import { Permission, UtilisateurCourant } from '../identite/gardes';
import type { JetonAcces } from '../identite/jetons.service';
import { AdminProduitsService } from './admin-produits.service';

const TAILLE_MAX_IMAGE = 5 * 1024 * 1024;
const TYPES_IMAGE = ['image/jpeg', 'image/png', 'image/webp'];

class CriteresAdminDto {
  @IsOptional() @IsString() @MaxLength(120)
  q?: string;

  @IsOptional() @IsUUID()
  categorieId?: string;

  @IsOptional() @IsIn(['publies', 'brouillons'])
  publication?: 'publies' | 'brouillons';

  @IsOptional() @IsIn(['normal', 'sous-seuil', 'rupture'])
  stock?: EtatStock;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number;
}

export class CreationProduitDto {
  @IsString() @Length(2, 160, { message: 'nom : entre 2 et 160 caractères' })
  nom!: string;

  @IsOptional() @IsString() @MaxLength(40, { message: 'reference : 40 caractères au plus' })
  reference?: string | null;

  @IsUUID('all', { message: 'categorieId : choisissez une catégorie' })
  categorieId!: string;

  @IsOptional() @IsString() @MaxLength(80)
  rayon?: string;

  @IsOptional() @IsString() @MaxLength(5000)
  description?: string;

  @IsInt({ message: 'prix : nombre entier en FCFA attendu' }) @Min(1, { message: 'prix : doit être positif' })
  prix!: number;

  @IsOptional() @IsInt({ message: 'prixBarre : nombre entier en FCFA attendu' }) @Min(1)
  prixBarre?: number | null;

  @IsOptional() @IsBoolean()
  nouveau?: boolean;

  @IsOptional() @IsBoolean()
  publie?: boolean;

  @IsOptional() @IsString() @MaxLength(40)
  icone?: string | null;

  @IsOptional() @IsInt() @Min(0)
  seuilAlerte?: number;

  @IsOptional() @IsArray() @ArrayMaxSize(40)
  caracteristiques?: [string, string][];
}

export class ModificationProduitDto extends PartialType(CreationProduitDto) {}

export class MouvementDto {
  @IsIn(['ENTREE', 'SORTIE', 'INVENTAIRE'], { message: 'type : ENTREE, SORTIE ou INVENTAIRE' })
  type!: 'ENTREE' | 'SORTIE' | 'INVENTAIRE';

  @IsInt({ message: 'quantite : nombre entier attendu' }) @Min(0, { message: 'quantite : ne peut pas être négative' })
  quantite!: number;

  @IsOptional() @IsString() @MaxLength(255)
  motif?: string;
}

/** Administration du catalogue et des stocks. Chaque route exige sa permission. */
@Controller('admin')
export class AdminProduitsController {
  constructor(private readonly service: AdminProduitsService) {}

  @Get('produits')
  @Permission('produit.voir')
  lister(@Query() criteres: CriteresAdminDto) {
    return this.service.lister(criteres);
  }

  @Get('produits/:id')
  @Permission('produit.voir')
  lire(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.lire(id);
  }

  @Post('produits')
  @Permission('produit.modifier')
  creer(@Body() corps: CreationProduitDto, @UtilisateurCourant() jeton: JetonAcces) {
    return this.service.creer(corps, jeton.sub);
  }

  @Patch('produits/:id')
  @Permission('produit.modifier')
  modifier(@Param('id', ParseUUIDPipe) id: string, @Body() corps: ModificationProduitDto, @UtilisateurCourant() jeton: JetonAcces) {
    return this.service.modifier(id, corps, jeton.sub);
  }

  @Delete('produits/:id')
  @Permission('produit.modifier')
  @HttpCode(HttpStatus.NO_CONTENT)
  retirer(@Param('id', ParseUUIDPipe) id: string, @UtilisateurCourant() jeton: JetonAcces) {
    return this.service.retirer(id, jeton.sub);
  }

  @Post('produits/:id/images')
  @Permission('produit.modifier')
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: TAILLE_MAX_IMAGE },
      fileFilter: (_req, fichier, rappel) =>
        TYPES_IMAGE.includes(fichier.mimetype)
          ? rappel(null, true)
          : rappel(new Probleme('image-invalide', HttpStatus.BAD_REQUEST, 'Format accepté : JPG, PNG ou WebP'), false),
    }),
  )
  ajouterImage(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() fichier: Express.Multer.File | undefined,
    @UtilisateurCourant() jeton: JetonAcces,
  ) {
    if (!fichier) throw new Probleme('image-invalide', HttpStatus.BAD_REQUEST, 'Aucune image reçue');
    return this.service.ajouterImage(id, fichier.buffer, jeton.sub);
  }

  @Delete('produits/:id/images/:imageId')
  @Permission('produit.modifier')
  supprimerImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
    @UtilisateurCourant() jeton: JetonAcces,
  ) {
    return this.service.supprimerImage(id, imageId, jeton.sub);
  }

  @Get('stocks')
  @Permission('stock.ajuster')
  stocks() {
    return this.service.vueStocks();
  }

  @Post('stocks/:produitId/mouvements')
  @Permission('stock.ajuster')
  @HttpCode(HttpStatus.NO_CONTENT)
  mouvement(@Param('produitId', ParseUUIDPipe) produitId: string, @Body() corps: MouvementDto, @UtilisateurCourant() jeton: JetonAcces) {
    return this.service.mouvement(produitId, corps, jeton.sub);
  }
}
