import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdministracionService } from '../../core/services/administracion.service';
import { AuthService } from '../../core/services/auth.service';

@Component({selector:'app-configuracion',standalone:true,imports:[CommonModule,FormsModule,ReactiveFormsModule],templateUrl:'./configuracion.component.html',styleUrls:['./configuracion.component.scss']})
export class ConfiguracionComponent implements OnInit {
  private readonly administracion=inject(AdministracionService); private readonly auth=inject(AuthService); private readonly fb=inject(FormBuilder);
  readonly cuenta=this.auth.user; readonly esAdministrador=this.cuenta?.rol==='ADMINISTRADOR'; loading=false; message=''; error=''; confirmarCambio=false;
  form=this.fb.nonNullable.group({nombreInstitucion:['',[Validators.required,Validators.pattern(/.*\S.*/)]],porcentajeManoObraDefecto:[0,[Validators.required,Validators.min(0),Validators.max(100)]],porcentajeGananciaDefecto:[0,[Validators.required,Validators.min(0),Validators.max(100)]]});
  ngOnInit(){if(this.esAdministrador)this.load();}
  load(){this.loading=true;this.error='';this.administracion.config().subscribe({next:c=>{this.form.patchValue({nombreInstitucion:c.nombreInstitucion,porcentajeManoObraDefecto:Number(c.porcentajeManoObraDefecto),porcentajeGananciaDefecto:Number(c.porcentajeGananciaDefecto)});this.loading=false;},error:e=>{this.error=e.error?.message??'No fue posible cargar la configuración.';this.loading=false;}})}
  save(){if(this.form.invalid||!this.confirmarCambio){this.error=this.confirmarCambio?'Revise los valores ingresados.':'Confirme que comprende el alcance del cambio.';return;}this.loading=true;this.error='';this.administracion.saveConfig(this.form.getRawValue()).subscribe({next:()=>{this.message='Configuración guardada correctamente.';this.confirmarCambio=false;this.loading=false;this.load();},error:e=>{this.error=e.error?.message??'No fue posible guardar la configuración.';this.loading=false;}})}
}