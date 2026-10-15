import {
  BadRequestException,
  NotFoundException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
//import { EmailService } from '../../common/email/email.service';
import { JwtService } from '@nestjs/jwt';
import { authenticator } from 'otplib';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import * as speakeasy from 'speakeasy';
import { GraphMailService } from '../notifications/graph-mail.service';
import { forgotPasswordHtml } from '../notifications/email-templates';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  //constructor(private prisma: PrismaService, private jwt: JwtService, private config: ConfigService) {}

  constructor(
    private readonly prisma: PrismaService,
    //private readonly emailService: EmailService,
    private readonly mailService: GraphMailService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) { }

  private get prismaAny() {
    return this.prisma as any;
  }
  async validateUser(email: string, password: string) {
    // cast prisma to any to avoid TS errors if client not generated
    const prismaAny = this.prisma as any;
    const user = await prismaAny.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) return null;
    const check = await bcrypt.compare(password, user.passwordHash);
    if (!check) return null;
    if (!user.isActive) throw new UnauthorizedException('ACCOUNT_INACTIVE');
    return user;
  }

  /*async login(user: any) {
    const prismaAny = this.prisma as any;
    // gather roles
    const rolesRel = await prismaAny.userRole.findMany({ where: { userId: user.id }, include: { role: true } });
    const roleIds = rolesRel.map((r) => r.roleId);
    const rolePermissions = await prismaAny.rolePermission.findMany({ where: { roleId: { in: roleIds } }, include: { permission: true } });
    const permissions = [...new Set(rolePermissions.map((rp) => rp.permission.name))];

    const payload = { sub: user.id, email: user.email, roles: rolesRel.map((r) => r.role.name), permissions };

    const accessToken = this.jwt.sign(payload);
    const refreshToken = await this.createRefreshToken(user.id);

    return { accessToken, refreshToken: refreshToken.token, user: { id: user.id, email: user.email, displayName: user.displayName, mustChangePassword: user.mustChangePassword } };
  }*/

  async login(user: any) {
    const permissions = await this.getUserPermissions(user.id);

    // If MFA is enabled, don't issue tokens yet – ask for 2nd factor
    if (user.mfaEnabled) {
      const mfaToken = await this.jwtService.signAsync(
        {
          sub: user.id,
          stage: 'mfa',
          permissions,
        },
        {
          expiresIn: '24h',
        },
      );

      return {
        mfaRequired: true,
        mfaToken,
      };
    }

    await this.updateLastLogin(user.id);

    // Normal login (no MFA)
    const payload = { sub: user.id, name: user.displayName ?? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(), permissions };
    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: '24h',
    });

    const refreshToken = await this.createRefreshToken(user.id);

    await this.logAudit(user.id, 'auth.login', 'User', user.id, {
      viaMfa: false,
    });

    return {
      accessToken,
      refreshToken,
      user: { ...user, permissions },
    };
  }


  async createRefreshToken(userId: string) {
    const prismaAny = this.prisma as any;
    const token = Math.random().toString(36).slice(2) + Date.now();
    //const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days
    return prismaAny.refreshToken.create({ data: { token, userId, expiresAt } });
  }

  async refreshToken(oldToken: string) {
    const prismaAny = this.prisma as any;
    const rt = await prismaAny.refreshToken.findUnique({ where: { token: oldToken }, include: { user: true } });
    if (!rt || rt.revoked || rt.expiresAt < new Date()) throw new UnauthorizedException('Invalid refresh token');
    await prismaAny.refreshToken.update({ where: { id: rt.id }, data: { revoked: true } });
    return this.login(rt.user);
  }

  async revokeRefreshToken(refreshToken: string) {
    const prismaAny = this.prisma as any;
    const rt = await prismaAny.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!rt) return false;
    await prismaAny.refreshToken.update({ where: { id: rt.id }, data: { revoked: true } });
    return true;
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user) return null;

    const permissions = new Set<string>();

    for (const ur of user.userRoles) {
      for (const rp of ur.role.rolePermissions) {
        if (rp.permission?.name) {
          permissions.add(rp.permission.name);
        }
      }
    }

    const roles = user.userRoles.map(ur => ({
      id: ur.role.id,
      name: ur.role.name,
      isSystem: ur.role.isSystem,
    }));

    const isSystem = roles.some(r => r.isSystem === true);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        displayName: user.displayName,
        mfaEnabled: user.mfaEnabled,
        mustChangePassword: user.mustChangePassword,
        defaultLandingPage: user.defaultLandingPage,
        phone: user.phone,
        profilePhotoUrl: user.profilePhotoUrl,
        isActive: user.isActive,
      },
      roles,
      permissions: Array.from(permissions),
      isSystem,
    };
  }

  async changePassword(
    userId: string,
    currentPassword: string | undefined,
    newPassword: string,
    secretQuestion?: string,
    secretAnswer?: string,
  ) {
    const prismaAny = this.prisma as any;

    const user = await prismaAny.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // If it's NOT first-login forced change, require current password
    if (!user.mustChangePassword) {
      if (!currentPassword) {
        throw new BadRequestException('Current password is required');
      }
      const ok = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!ok) {
        throw new UnauthorizedException('Current password is incorrect');
      }
    }

    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long');
    }

    const pwHash = await bcrypt.hash(newPassword, 12);

    let secretAnswerHash: string | undefined = undefined;
    if (secretAnswer && secretAnswer.trim()) {
      secretAnswerHash = await bcrypt.hash(secretAnswer.trim(), 12);
    }

    await prismaAny.user.update({
      where: { id: user.id },
      data: {
        passwordHash: pwHash,
        mustChangePassword: false,
        secretQuestion: secretQuestion || user.secretQuestion,
        secretAnswerHash: secretAnswerHash || user.secretAnswerHash,
      },
    });

    return { success: true };
  }

  async requestPasswordReset(email: string) {
    const prismaAny = this.prisma as any;

    const user = await prismaAny.user.findUnique({ where: { email } });

    if (!user) {
      // don't reveal presence - but preserve prior behavior: you originally threw BadRequest here.
      // It is safer to respond generically, but to preserve your previous flow:
      throw new BadRequestException('Email does not exist in our system.');
    }

    // create token and persist
    const token = Math.random().toString(36).slice(2) + Date.now();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 30); // 30 minutes

    await prismaAny.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    const baseUrl = process.env.APP_BASE_URL ?? 'http://localhost:9000';
    const resetUrl = `${baseUrl}/auth/reset?token=${token}`;

    const html = forgotPasswordHtml(user.displayName ?? user.email, resetUrl, {
      logoUrl: process.env.EMAIL_LOGO_URL,
      appName: process.env.APP_NAME ?? 'AIRCO AIMS',
    });

    try {
      await this.mailService.sendMail({
        to: user.email,
        subject: 'AIRCO AIMS – Password reset',
        html,
        fromDisplayName: process.env.EMAIL_FROM_NAME ?? 'AIRCO AIMS',
        saveToSentItems: true,
      });
      this.prismaAny.auditLog?.create?.({ data: { actorId: user.id, actorType: 'User', action: 'auth.requestPasswordReset', metadata: { email: user.email } } }).catch(() => { });
    } catch (err) {
      // log, but do not leak detailed errors to clients
      console.error('Failed to send reset email', err);
      // Option: rethrow if you want endpoint to surface failure
      throw new Error('Failed to send password reset email');
    }
  }


  async validateResetToken(token: string) {
    const entry = await this.prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!entry || entry.usedAt || entry.expiresAt < new Date()) {
      return { valid: false };
    }

    return { valid: true };
  }


  async resetPassword(token: string, newPassword: string) {
    const prismaAny = this.prisma as any;

    const entry = await prismaAny.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!entry || entry.usedAt || entry.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired reset link');
    }

    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long');
    }

    const hash = await bcrypt.hash(newPassword, 12);

    await prismaAny.$transaction([
      prismaAny.user.update({
        where: { id: entry.userId },
        data: {
          passwordHash: hash,
          mustChangePassword: false,
        },
      }),
      prismaAny.passwordResetToken.update({
        where: { id: entry.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { success: true };
  }

  async verifyMfaAndLogin(mfaToken: string, code: string) {
    let decoded: any;

    try {
      decoded = await this.jwtService.verifyAsync(mfaToken);
    } catch {
      throw new UnauthorizedException(
        'MFA session expired. Please log in again.',
      );
    }

    if (!decoded || decoded.stage !== 'mfa' || !decoded.sub) {
      throw new UnauthorizedException('Invalid MFA session.');
    }

    const userId = decoded.sub as string;

    const user = await this.prismaAny.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.mfaEnabled || !user.mfaSecret) {
      throw new UnauthorizedException('MFA is not enabled for this account.');
    }

    const ok = authenticator.verify({ token: code, secret: user.mfaSecret });
    if (!ok) {
      throw new UnauthorizedException('Invalid MFA code.');
    }

    const permissions = await this.getUserPermissions(userId);

    await this.updateLastLogin(user.id);

    const payload = { sub: userId, name: user.displayName ?? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(), permissions };
    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: '24h',
    });

    const refreshToken = await this.createRefreshToken(userId);

    await this.logAudit(userId, 'auth.login', 'User', userId, {
      viaMfa: true,
    });

    return {
      accessToken,
      refreshToken,
      user: { ...user, permissions },
    };
  }


  /*async startMfaSetup(userId: string) {
  const prismaAny = this.prisma as any;

  const user = await prismaAny.user.findUnique({
    where: { id: userId },
  });
  if (!user) {
    throw new BadRequestException('User not found.');
  }

  const secret = authenticator.generateSecret();
  const issuer = 'AIRCO AIMS';
  const label = user.email;
  const otpauthUrl = authenticator.keyuri(label, issuer, secret);

  await prismaAny.user.update({
    where: { id: userId },
    data: { mfaSecret: secret },
  });

  return {
    secret,
    otpauthUrl,
  };
}
  
  async disableMfa(userId: string) {
    const prismaAny = this.prisma as any;

    const updated = await prismaAny.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
      },
    });

    await this.logAudit(userId, 'user.mfaDisabled', 'User', userId, {});

    return updated;
  }
    
  */

  async confirmMfaSetup(userId: string, code: string) {
    const prismaAny = this.prisma as any;

    const user = await prismaAny.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.mfaSecret) {
      throw new BadRequestException('MFA setup has not been started.');
    }

    const ok = authenticator.verify({ token: code, secret: user.mfaSecret });
    if (!ok) {
      throw new BadRequestException('Invalid MFA code. Please try again.');
    }

    const updated = await prismaAny.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: true,
      },
    });

    await this.logAudit(userId, 'user.mfaEnabled', 'User', userId, {});

    return updated;
  }


  async startMfaSetup(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // const secret = speakeasy.generateSecret({
    //   issuer : 'AIRCO AIMS',
    //   name: `Airco AIMS (${user.email})`,
    // });

    // await this.prisma.user.update({
    //   where: { id: userId },
    //   data: {
    //     mfaSecret: secret.base32,
    //     // we only enable after successful verify
    //   },
    // });

    // return {
    //   secret: secret.base32,
    //   otpauthUrl: secret.otpauth_url,
    // };

    const secret = authenticator.generateSecret();
    const issuer = 'AIRCO AIMS';
    const account = user.email;
    const otpauthUrl = authenticator.keyuri(
      account,
      issuer,
      secret,
    );
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaSecret: secret,
      },
    });

    return {
      secret,
      otpauthUrl,
    };

  }

  async verifyAndEnableMfa(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.mfaSecret) {
      throw new BadRequestException('MFA setup has not been started.');
    }

    const ok = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token: code,
      window: 1,
    });

    if (!ok) {
      throw new BadRequestException('Invalid authentication code.');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: true,
      },
    });

    // you can also log audit here if you want
    // await this.logAudit(userId, 'user.mfaEnabled', 'User', userId, {});

    return {
      mfaEnabled: updated.mfaEnabled,
    };
  }

  async disableMfa(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
      },
    });

    // await this.logAudit(userId, 'user.mfaDisabled', 'User', userId, {});

    return {
      mfaEnabled: updated.mfaEnabled,
    };
  }



  private async getUserPermissions(userId: string): Promise<string[]> {
    const roles = await this.prismaAny.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    const perms = new Set<string>();
    for (const ur of roles) {
      for (const rp of ur.role.rolePermissions) {
        if (rp.permission?.name) {
          perms.add(rp.permission.name);
        }
      }
    }

    return Array.from(perms);
  }

  private async logAudit(
    actorId: string | null,
    action: string,
    entityType?: string,
    entityId?: string,
    metadata?: any,
  ) {
    await this.prismaAny.auditLog.create({
      data: {
        actorId,
        actorType: 'User',
        action,
        entityType: entityType || null,
        entityId: entityId || null,
        metadata: metadata ?? null,
      },
    });
  }

  async activateAccount(token: string) {
    const entry = await this.prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (
      !entry ||
      entry.usedAt ||
      entry.expiresAt < new Date() ||
      entry.type !== 'ACCOUNT_ACTIVATION'
    ) {
      throw new BadRequestException('Invalid or expired activation link');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: entry.userId },
        data: { isActive: true },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: entry.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { success: true };
  }

  private async updateLastLogin(userId: string) {
    await this.prismaAny.user.update({
      where: { id: userId },
      data: {
        lastLoginAt: new Date(),
      },
    });
  }

}
