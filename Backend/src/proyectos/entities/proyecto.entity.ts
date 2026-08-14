import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { EstadoCatalogo } from '../../auth/entities/rol.entity';
import { Usuario } from '../../auth/entities/usuario.entity';
@Entity({name:'proyecto'}) export class Proyecto { @PrimaryColumn({type:'bigint'}) id:string; @Column({name:'estudiante_id',type:'bigint'}) estudianteId:string; @Column() nombre:string; @Column({type:'text',nullable:true}) descripcion:string|null; @Column({type:'enum',enum:EstadoCatalogo,enumName:'estado_catalogo'}) estado:EstadoCatalogo; @Column({name:'created_at',type:'timestamptz'}) createdAt:Date; @Column({name:'updated_at',type:'timestamptz'}) updatedAt:Date; @ManyToOne(()=>Usuario) @JoinColumn({name:'estudiante_id'}) estudiante:Usuario; }
