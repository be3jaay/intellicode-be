import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SupabaseJwtStrategy } from './strategies/supabase-jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { PrismaModule } from '@/core/prisma/prisma.module';
import { SupabaseModule } from '@/core/supabase/supabase.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'supabase-jwt' }),
    PrismaModule,
    SupabaseModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, SupabaseJwtStrategy, LocalStrategy],
  exports: [AuthService],
})
export class AuthModule {}
