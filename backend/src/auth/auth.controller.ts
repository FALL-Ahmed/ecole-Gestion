import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  UsePipes,
  Scope,
  ValidationPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import {
  AuthService,
  ILoginSuccessResponse,
  ISelectionRequiredResponse,
} from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SelectBlocDto } from './dto/select-bloc.dto';
import { PreselectionAuthGuard } from './preselection-auth.guard';

@Controller('api/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @UsePipes(new ValidationPipe())
  async login(
    @Body() loginDto: LoginDto,
  ): Promise<ILoginSuccessResponse | ISelectionRequiredResponse> {
    return this.authService.login(loginDto);
  }

  @Post('select-bloc')
  @UseGuards(PreselectionAuthGuard)
  @UsePipes(new ValidationPipe())
  async selectBloc(
    @Body() selectBlocDto: SelectBlocDto,
    @Req() req: Request & { user: { userId: number } },
  ) {
    // Le PreselectionAuthGuard a déjà validé le token et attaché le payload à `req.user`.
    return this.authService.selectBlocAndLogin(req.user.userId, selectBlocDto.blocId);
  }
}
