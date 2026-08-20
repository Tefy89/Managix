import { CommonModule } from '@angular/common';
import { Component, OnDestroy, inject, OnInit } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdministracionService } from '../../core/services/administracion.service';
import { AuthService } from '../../core/services/auth.service';
@Component({selector:'app-configuracion',standalone:true,imports:[CommonModule,FormsModule,ReactiveFormsModule],templateUrl:'./configuracion.component.html',styleUrls:['./configuracion.component.scss']})
export class ConfiguracionComponent implements OnInit,OnDestroy {
  private readonly administracion=inject(AdministracionService); readonly auth=inject(AuthService); private readonly fb=inject(FormBuilder);
  get cuenta(){return this.auth.user;} get esAdministrador(){return this.cuenta?.rol==='ADMINISTRADOR';} loading=false; photoLoading=false; message=''; error=''; confirmarCambio=false; fotoUrl=''; fotoError='';
  form=this.fb.nonNullable.group({nombreInstitucion:['',[Validators.required,Validators.pattern(/.*\S.*/)]],porcentajeManoObraDefecto:[0,[Validators.required,Validators.min(0),Validators.max(100)]],porcentajeGananciaDefecto:[0,[Validators.required,Validators.min(0),Validators.max(100)]]});
  ngOnInit(){if(this.esAdministrador)this.load();if(this.cuenta?.tieneFotoPerfil)this.cargarFoto();}
  ngOnDestroy(){this.limpiarUrl();}
  get iniciales(){return `${this.cuenta?.nombre?.[0]??''}${this.cuenta?.apellido?.[0]??''}`.toUpperCase();}
  load(){this.loading=true;this.error='';this.administracion.config().subscribe({next:c=>{this.form.patchValue({nombreInstitucion:c.nombreInstitucion,porcentajeManoObraDefecto:Number(c.porcentajeManoObraDefecto),porcentajeGananciaDefecto:Number(c.porcentajeGananciaDefecto)});this.loading=false;},error:e=>{this.error=e.error?.message??'No fue posible cargar la configuración.';this.loading=false;}})}
  save(){if(this.form.invalid||!this.confirmarCambio){this.error=this.confirmarCambio?'Revise los valores ingresados.':'Confirme que comprende el alcance del cambio.';return;}this.loading=true;this.error='';this.administracion.saveConfig(this.form.getRawValue()).subscribe({next:()=>{this.message='Configuración guardada correctamente.';this.confirmarCambio=false;this.loading=false;this.load();},error:e=>{this.error=e.error?.message??'No fue posible guardar la configuración.';this.loading=false;}})}
  seleccionarFoto(event:Event){const file=(event.target as HTMLInputElement).files?.[0];if(!file)return;this.fotoError='';if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024){this.fotoError='Selecciona una imagen JPG, PNG o WEBP de máximo 5 MB.';return;}this.limpiarUrl();this.fotoUrl=URL.createObjectURL(file);this.photoLoading=true;this.auth.subirFotoPerfil(file).subscribe({next:()=>{this.photoLoading=false;this.message='Foto de perfil actualizada correctamente.';},error:e=>{this.photoLoading=false;this.fotoError=e.error?.message??'No fue posible cargar la foto.';this.cargarFoto();}});}
  eliminarFoto(){this.photoLoading=true;this.auth.eliminarFotoPerfil().subscribe({next:()=>{this.photoLoading=false;this.limpiarUrl();this.message='Foto de perfil eliminada.';},error:e=>{this.photoLoading=false;this.fotoError=e.error?.message??'No fue posible eliminar la foto.';}});}
  private cargarFoto(){this.auth.fotoPerfil().subscribe({next:b=>{this.limpiarUrl();this.fotoUrl=URL.createObjectURL(b);},error:()=>this.limpiarUrl()});} private limpiarUrl(){if(this.fotoUrl)URL.revokeObjectURL(this.fotoUrl);this.fotoUrl='';}
}