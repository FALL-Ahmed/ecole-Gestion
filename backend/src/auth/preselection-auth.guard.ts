import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class PreselectionAuthGuard extends AuthGuard('jwt-preselection') {}

