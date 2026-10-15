import { Body, Controller, Post, Get, UseGuards, Req, Query  } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GraphMailService } from '../notifications/graph-mail.service';
import crypto from 'crypto';


@Controller('auth')
export class AuthController {
  constructor(
    private readonly mail: GraphMailService,
    private readonly auth: AuthService) {}

  @Post('login')
  async login(@Body() body: LoginDto) {
    const email = body.email.trim().toLowerCase();
    const user = await this.auth.validateUser(email, body.password);
    if (!user) throw new Error('Invalid credentials');
    const data = await this.auth.login(user);
    return { data };
  }

  @Post('mfa/login')
  async verifyMfaLogin(
    @Body() body: { mfaToken: string; code: string },
  ) {
    const data = await this.auth.verifyMfaAndLogin(
      body.mfaToken,
      body.code,
    );
    return { data };
  }

 /* @Post('mfa/setup')
  @UseGuards(JwtAuthGuard)
  async startMfa(@Req() req: any) {
    const userId = req.user?.id;
    const data = await this.auth.startMfaSetup(userId);
    return { data };
  }

  @Post('mfa/setup/confirm')
  @UseGuards(JwtAuthGuard)
  async confirmMfa(
    @Req() req: any,
    @Body() body: { code: string },
  ) {
    const userId = req.user?.id;
    const data = await this.auth.confirmMfaSetup(userId, body.code);
    return { data };
  }

  @Post('mfa/disable')
  @UseGuards(JwtAuthGuard)
  async disableMfa(@Req() req: any) {
    const userId = req.user?.id;
    const data = await this.auth.disableMfa(userId);
    return { data };
  }
*/

 @UseGuards(JwtAuthGuard)
@Post('mfa/setup')
async startMfaSetup(@Req() req: any) {
  const userId = req.user.id;
  const data = await this.auth.startMfaSetup(userId);
  return { data };
}

@UseGuards(JwtAuthGuard)
@Post('mfa/verify')
async verifyMfa(
  @Req() req: any,
  @Body() body: { code: string },
) {
  const userId = req.user.id;
  const data = await this.auth.verifyAndEnableMfa(userId, body.code);
  return { data };
}

@UseGuards(JwtAuthGuard)
@Post('mfa/disable')
async disableMfa(@Req() req: any) {
  const userId = req.user.id;
  const data = await this.auth.disableMfa(userId);
  return { data };
}

  @Post('refresh')
  async refresh(@Body() body: { refreshToken: string }) {
    const data = await this.auth.refreshToken(body.refreshToken);
    return { data };
  }

  @Post('logout')
  async logout(@Body() body: { refreshToken: string }) {
    await this.auth.revokeRefreshToken(body.refreshToken);
    return { message: 'Logged out' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: any) {
    const current = await this.auth.getMe(req.user.id);
    return { data: current };
  }

  @Post('forgot-password')
  async forgotPassword(@Body() body: { email: string }) {
    await this.auth.requestPasswordReset(body.email);
    return { message: 'If the email exists, a reset link has been sent.' };
  }

  @Post('reset-password')
  async resetPassword(@Body() body: { token: string; password: string }) {
    await this.auth.resetPassword(body.token, body.password);
    return { message: 'Password has been reset successfully.' };
  }

  @Get('validate-reset-token')
  async validateResetToken(@Query('token') token: string) {
   return this.auth.validateResetToken(token);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(
    @Req() req: any,
    @Body()
    body: {
      currentPassword?: string;
      newPassword: string;
      secretQuestion?: string;
      secretAnswer?: string;
    },
  ) {
    await this.auth.changePassword(
      req.user.id,
      body.currentPassword,
      body.newPassword,
      body.secretQuestion,
      body.secretAnswer,
    );
    return { message: 'Password changed successfully.' };
  }

  @Get('activate')
  activate(@Query('token') token: string) {
    return this.auth.activateAccount(token);
  } 

}
