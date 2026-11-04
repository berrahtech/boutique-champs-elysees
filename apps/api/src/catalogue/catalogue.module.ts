import { Module } from '@nestjs/common';
import { AdminProduitsController } from '../admin/admin-produits.controller';
import { AdminProduitsService } from '../admin/admin-produits.service';
import { PanierController, PanierService } from '../panier/panier.controller';
import { CatalogueController } from './catalogue.controller';
import { CatalogueService } from './catalogue.service';

/** Catalogue public, panier et administration du catalogue. */
@Module({
  controllers: [CatalogueController, PanierController, AdminProduitsController],
  providers: [CatalogueService, PanierService, AdminProduitsService],
})
export class CatalogueModule {}
