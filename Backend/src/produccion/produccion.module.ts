import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Auditoria } from '../administracion/entities/auditoria.entity';
import { TipoPrenda } from '../catalogos/entities/catalogos.entities';
import { VersionCosteo } from '../costeo/entities/version-costeo.entity';
import { Proyecto } from '../proyectos/entities/proyecto.entity';
import { Usuario } from '../auth/entities/usuario.entity';
import { OrdenProduccion } from './entities/orden-produccion.entity';
import { EtapaProduccion, OrdenProduccionEtapa } from './entities/orden-produccion-etapa.entity';
import { EvidenciaEtapa } from './entities/evidencia-etapa.entity';
import { RevisionEtapa } from './entities/revision-etapa.entity';
import { Notificacion } from '../notificaciones/entities/notificacion.entity';
import { ProduccionController } from './produccion.controller';
import { ProduccionService } from './produccion.service';
@Module({ imports: [TypeOrmModule.forFeature([OrdenProduccion, VersionCosteo, Proyecto, TipoPrenda, Usuario, Auditoria, EtapaProduccion, OrdenProduccionEtapa, EvidenciaEtapa, RevisionEtapa, Notificacion])], controllers: [ProduccionController], providers: [ProduccionService] })
export class ProduccionModule {}




