import{Module}from'@nestjs/common';import{TypeOrmModule}from'@nestjs/typeorm';import{CosteoController}from'./costeo.controller';import{CosteoService}from'./costeo.service';import{VersionCosteoMedida}from'./entities/version-costeo-medida.entity';
import{VersionCosteoTela}from'./entities/version-costeo-tela.entity';
import{VersionCosteoInsumo}from'./entities/version-costeo-insumo.entity';import{VersionCosteo}from'./entities/version-costeo.entity';import{Proyecto}from'../proyectos/entities/proyecto.entity';import{Insumo,ReglaConsumoTela,Tela,TipoPrenda}from'../catalogos/entities/catalogos.entities';import{ConfiguracionGeneral}from'../administracion/entities/configuracion-general.entity';import{Auditoria}from'../administracion/entities/auditoria.entity';@Module({imports:[TypeOrmModule.forFeature([VersionCosteo,VersionCosteoMedida,VersionCosteoTela,VersionCosteoInsumo,Proyecto,TipoPrenda,Tela,Insumo,ReglaConsumoTela,ConfiguracionGeneral,Auditoria])],controllers:[CosteoController],providers:[CosteoService]})export class CosteoModule{}




