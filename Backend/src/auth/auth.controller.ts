import { Body, Controller, Delete, Get, Post, Request, StreamableFile, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { createReadStream } from 'fs';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtPayload } from './auth.types';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Post('login') login(@Body() loginDto: LoginDto) { return this.authService.login(loginDto); }
  @UseGuards(JwtAuthGuard) @Get('me') me(@Request() request: { user: JwtPayload }) { return this.authService.getAuthenticatedUser(request.user.sub); }
  @UseGuards(JwtAuthGuard) @Post('me/foto') @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 6 * 1024 * 1024 } })) subirFoto(@UploadedFile() file: { mimetype: string; size: number; buffer: Buffer } | undefined, @Request() request: { user: JwtPayload }) { return this.authService.subirFotoPerfil(request.user.sub, file); }
  @UseGuards(JwtAuthGuard) @Get('me/foto') async foto(@Request() request: { user: JwtPayload }) { const foto = await this.authService.fotoPerfil(request.user.sub); return new StreamableFile(createReadStream(foto.path), { type: foto.mime }); }
  @UseGuards(JwtAuthGuard) @Delete('me/foto') eliminarFoto(@Request() request: { user: JwtPayload }) { return this.authService.eliminarFotoPerfil(request.user.sub); }
}