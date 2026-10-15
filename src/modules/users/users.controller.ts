import {
  UseInterceptors, UploadedFile,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  BadRequestException,
  InternalServerErrorException
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Permissions } from '../../common/rbac/permissions.decorator';
import { PermissionsGuard } from '../../common/rbac/permissions.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { join } from 'path';
import * as fs from 'fs';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}
 
@Get()
@Permissions('users.view')
async list(
  @Query('search') search?: string,
  @Query('status') status?: 'all' | 'active' | 'inactive',
  @Query('skip') skip = '0',
  @Query('take') take = '10',
  @Query('sortKey') sortKey?: string,
  @Query('sortDir') sortDir?: 'asc' | 'desc',
  @Query() query?: Record<string, any>,
) {
  const filters: Record<string, string> = {};

  Object.keys(query || {}).forEach((k) => {
    if (k.startsWith('filter_') && query[k]) {
      filters[k.replace('filter_', '')] = query[k];
    }
  });

  return this.users.list({
    search,
    status,
    skip: Number(skip),
    take: Number(take),
    sortKey,
    sortDir,
    filters,
  });
}


  @Get(':id')
  @Permissions('users.view')
  async getOne(@Param('id') id: string) {
    const data = await this.users.findOne(id);
    return { data };
  }

  @Post()
  @Permissions('users.create')
  async create(@Req() req: any, @Body() dto: CreateUserDto) {
    const actorId = req.user?.id ?? null;
    const data = await this.users.create(dto, actorId);
    return { data };
  }

  @Patch(':id')
  @Permissions('users.edit')
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    const actorId = req.user?.id ?? null;
    const data = await this.users.update(id, dto, actorId);
    return { data };
  }

  @Patch(':id/status')
  @Permissions('users.edit')
  async updateStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { isActive: boolean },
  ) {
    const actorId = req.user?.id ?? null;
    const data = await this.users.setStatus(id, body.isActive, actorId);
    return { data };
  }

  //  @Delete(':id')
  // @Permissions('users.delete')
  // async remove(@Req() req: any, @Param('id') id: string, @Query('cascade') cascade?: 'true' | 'false') {
  //   const actorId = req.user?.id ?? null;
  //   // cascade query param is optional; service method will remove relations anyway
  //   const forceCascade = cascade === 'true';
  //   const data = await this.users.remove(id, actorId, { cascade: forceCascade });
  //   return { data };
  // }

  @Delete(':id')
  @Permissions('users.delete')
  async deactivate(@Req() req: any, @Param('id') id: string) {
    const actorId = req.user?.id ?? null;
    const data = await this.users.deactivate(id, actorId);
    return { data };
  }

  @Get(':id/purge')
  @Permissions('users.delete')
  async purge(@Req() req: any, @Param('id') id: string) {
    const actorId = req.user?.id ?? null;
    const data = await this.users.purge(id, actorId);
    return { data };
  }

  
@Post(':id/avatar')
  @Permissions('users.edit') // adjust permission
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadDir = join(process.cwd(), 'public/uploads/avatars');
          try {
            fs.mkdirSync(uploadDir, { recursive: true });
            cb(null, uploadDir);
          } catch (err) {
            cb(err, uploadDir);
          }
        },
        filename: (req, file, cb) => {
          // sanitize/construct filename
          const ext = file.originalname.split('.').pop();
          const baseName = `${req.params.id}-${Date.now()}`;
          const safeName = `${baseName}.${ext ?? 'png'}`;
          cb(null, safeName);
        },
      }),
      limits: {
        fileSize: 2 * 1024 * 1024, // 2MB
      },
      fileFilter: (req, file, cb) => {
        // accept only images
        if (!file.mimetype.startsWith('image/')) {
          return cb(new BadRequestException('Only image files are allowed'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadAvatar(
    @Req() req: any,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded. Make sure the form field is named "avatar".');
    }
    if (!file.filename) {
      throw new InternalServerErrorException('Multer did not return a filename for the uploaded file.');
    }
    const relativePath = `/uploads/avatars/${file.filename}`;

    try {
      const updated = await this.users.setAvatarUrl(id, relativePath, req.user?.id ?? null);
      return { data: updated };
    } catch (err) {
      try {
        const absolute = join(process.cwd(), 'apps', 'api', 'public', relativePath);
        if (fs.existsSync(absolute)) fs.unlinkSync(absolute);
      } catch (e) {
        console.error('Failed cleanup after avatar upload error', e);
      }

      console.error('uploadAvatar error', err);
      throw new InternalServerErrorException('Failed to save avatar');
    }
  }

  @Post('resend-activation')
  resendActivation(@Body('email') email: string) {
    return this.users.resendActivation(email);
  }

}
