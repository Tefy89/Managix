import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthUser, LoginRequest, LoginResponse, Session, UserRole } from '../models/auth.models';
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly storageKey='managix.session'; private readonly sessionSubject=new BehaviorSubject<Session|null>(this.readSession()); readonly session$=this.sessionSubject.asObservable();
  constructor(private readonly http:HttpClient){}
  login(credentials:LoginRequest):Observable<LoginResponse>{return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`,credentials).pipe(tap(r=>this.saveSession({accessToken:r.access_token,user:r.user})));}
  logout():void{localStorage.removeItem(this.storageKey);this.sessionSubject.next(null);}
  get token():string|null{return this.sessionSubject.value?.accessToken??null;} get user():AuthUser|null{return this.sessionSubject.value?.user??null;}
  fotoPerfil():Observable<Blob>{return this.http.get(`${environment.apiUrl}/auth/me/foto`,{responseType:'blob'});} subirFotoPerfil(file:File):Observable<{tieneFotoPerfil:boolean}>{const data=new FormData();data.append('file',file);return this.http.post<{tieneFotoPerfil:boolean}>(`${environment.apiUrl}/auth/me/foto`,data).pipe(tap(r=>this.actualizarFoto(r.tieneFotoPerfil)));} eliminarFotoPerfil():Observable<{tieneFotoPerfil:boolean}>{return this.http.delete<{tieneFotoPerfil:boolean}>(`${environment.apiUrl}/auth/me/foto`).pipe(tap(r=>this.actualizarFoto(r.tieneFotoPerfil)));}
  hasValidSession():boolean{const token=this.token;if(!token||this.isTokenExpired(token)){this.logout();return false;}return true;}
  redirectByRole(role:UserRole):string{return role==='ADMINISTRADOR'?'/admin':'/dashboard';}
  private actualizarFoto(tieneFotoPerfil:boolean):void{const s=this.sessionSubject.value;if(s)this.saveSession({...s,user:{...s.user,tieneFotoPerfil}});}
  private saveSession(session:Session):void{localStorage.setItem(this.storageKey,JSON.stringify(session));this.sessionSubject.next(session);}
  private readSession():Session|null{try{const value=localStorage.getItem(this.storageKey);if(!value)return null;const session=JSON.parse(value) as Session;return session.accessToken&&session.user?{...session,user:{...session.user,tieneFotoPerfil:!!session.user.tieneFotoPerfil}}:null;}catch{localStorage.removeItem(this.storageKey);return null;}}
  private isTokenExpired(token:string):boolean{try{const payload=JSON.parse(atob(token.split('.')[1])) as {exp?:number};return !payload.exp||payload.exp*1000<=Date.now();}catch{return true;}}
}