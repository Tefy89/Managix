import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from './config/database.config';
import { AuthModule } from './auth/auth.module';
import { AdministracionModule } from './administracion/administracion.module';
import { CatalogosModule } from './catalogos/catalogos.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
@Module({imports:[ConfigModule.forRoot({isGlobal:true,envFilePath:'.env'}),TypeOrmModule.forRootAsync({inject:[ConfigService],useFactory:databaseConfig}),AuthModule,AdministracionModule,CatalogosModule],controllers:[AppController],providers:[AppService]}) export class AppModule {}

