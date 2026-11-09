import { Module } from '@nestjs/common';
import { CatalogueModule } from '../catalogue/catalogue.module';
import { AdminCommandesController, CommandesController } from './commandes.controller';
import { CommandesService } from './commandes.service';

/** Commandes des clients et leur traitement par l'équipe. */
@Module({
  imports: [CatalogueModule],
  controllers: [CommandesController, AdminCommandesController],
  providers: [CommandesService],
})
export class CommandesModule {}
