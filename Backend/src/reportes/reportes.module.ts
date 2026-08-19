import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Auditoria } from '../administracion/entities/auditoria.entity';
import { Usuario } from '../auth/entities/usuario.entity';
import { TipoPrenda } from '../catalogos/entities/catalogos.entities';
import { VersionCosteoInsumo } from '../costeo/entities/version-costeo-insumo.entity';
import { VersionCosteoMedida } from '../costeo/entities/version-costeo-medida.entity';
import { VersionCosteoTela } from '../costeo/entities/version-costeo-tela.entity';
import { VersionCosteo } from '../costeo/entities/version-costeo.entity';
import { OrdenProduccion } from '../produccion/entities/orden-produccion.entity';
import { Proyecto } from '../proyectos/entities/proyecto.entity';
import { ReporteGenerado } from './entities/reporte-generado.entity';
import { CotizacionPdfService } from './pdf/cotizacion-pdf.service';
import { OrdenProduccionPdfService } from './pdf/orden-produccion-pdf.service';
import { FichaTecnicaPdfService } from './pdf/ficha-tecnica-pdf.service';
import { ReporteProyectoPdfService } from './pdf/reporte-proyecto-pdf.service';
import { ReportesController } from './reportes.controller';
import { ReportesService } from './reportes.service';
@Module({ imports: [TypeOrmModule.forFeature([ReporteGenerado, VersionCosteo, VersionCosteoMedida, VersionCosteoTela, VersionCosteoInsumo, Proyecto, TipoPrenda, Usuario, OrdenProduccion, Auditoria])], controllers: [ReportesController], providers: [ReportesService, CotizacionPdfService, OrdenProduccionPdfService, FichaTecnicaPdfService, ReporteProyectoPdfService] })
export class ReportesModule {}