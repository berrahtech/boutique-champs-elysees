import { Controller, Get, HttpStatus, Param, Query } from '@nestjs/common';
import type { Filtre, Tri } from '@lce/contrats';
import { Transform, Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { Probleme } from '../commun/erreurs/probleme';
import { Public } from '../identite/gardes';
import { CatalogueService } from './catalogue.service';

export class CriteresDto {
  @IsOptional() @IsString() @MaxLength(80)
  categorie?: string;

  @IsOptional() @IsString() @MaxLength(120)
  q?: string;

  @IsOptional() @IsIn(['tout', 'promotions', 'nouveautes', 'meilleures-ventes', 'petits-prix'])
  filtre?: Filtre;

  @IsOptional() @IsIn(['popularite', 'nouveautes', 'prix-croissant', 'prix-decroissant'])
  tri?: Tri;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  min?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  max?: number;

  @IsOptional() @Transform(({ value }) => value === '1' || value === 'true' || value === true) @IsBoolean()
  enStock?: boolean;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(48)
  parPage?: number;

  /** Liste d'identifiants séparés par des virgules (page Favoris). */
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',').filter(Boolean) : value))
  @IsArray()
  @IsUUID('all', { each: true })
  ids?: string[];
}

/** Lecture publique du catalogue. */
@Public()
@Controller()
export class CatalogueController {
  constructor(private readonly catalogue: CatalogueService) {}

  @Get('categories')
  categories() {
    return this.catalogue.categories();
  }

  @Get('zones')
  zones() {
    return this.catalogue.zones();
  }

  @Get('accueil')
  accueil() {
    return this.catalogue.accueil();
  }

  @Get('produits')
  produits(@Query() criteres: CriteresDto) {
    return this.catalogue.rechercher(criteres);
  }

  @Get('produits/:slug')
  async produit(@Param('slug') slug: string) {
    const detail = await this.catalogue.detail(slug);
    if (!detail) throw new Probleme('produit-introuvable', HttpStatus.NOT_FOUND, 'Produit introuvable');
    return detail;
  }
}
