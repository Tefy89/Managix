import { Column, Entity, PrimaryColumn } from 'typeorm';
@Entity({ name: 'configuracion_parametro_costeo' })
export class ConfiguracionParametroCosteo { @PrimaryColumn({type:'varchar',length:80}) codigo:string; @Column({type:'numeric'}) valor:string; @Column({name:'created_at',type:'timestamptz'}) createdAt:Date; @Column({name:'updated_at',type:'timestamptz'}) updatedAt:Date; }