import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../auth/roles.guard';
import { Auditoria } from '../administracion/entities/auditoria.entity';
import { Proyecto } from '../proyectos/entities/proyecto.entity';
import { VersionCosteo } from '../costeo/entities/version-costeo.entity';
import { CosteoModule } from '../costeo/costeo.module';
import { OrdenOperacionalController } from './orden-operacional.controller';
import { OrdenOperacionalService } from './orden-operacional.service';
import { Maquinaria, OrdenOperacional, OrdenOperacionalDetalle } from './entities/orden-operacional.entities';
@Module({ imports: [AuthModule, CosteoModule, TypeOrmModule.forFeature([Maquinaria, OrdenOperacional, OrdenOperacionalDetalle, VersionCosteo, Proyecto, Auditoria])], controllers: [OrdenOperacionalController], providers: [OrdenOperacionalService, RolesGuard], exports: [OrdenOperacionalService] })
export class OrdenOperacionalModule {}