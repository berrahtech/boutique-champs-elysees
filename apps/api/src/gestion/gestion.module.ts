import { Module } from '@nestjs/common';
import { ClientsController, ClientsService } from './clients.controller';
import { FinancesController, FinancesService } from './finances.controller';
import { LivreursController, LivreursService } from './livreurs.controller';
import { PersonnelController, PersonnelService } from './personnel.controller';
import { PromosController, PromosService } from './promos.controller';
import { ZonesController, ZonesService } from './zones.controller';

/** Administration hors catalogue : zones, codes promo, personnel, livreurs, clients, finances. */
@Module({
  controllers: [ZonesController, PromosController, PersonnelController, LivreursController, ClientsController, FinancesController],
  providers: [ZonesService, PromosService, PersonnelService, LivreursService, ClientsService, FinancesService],
})
export class GestionModule {}
