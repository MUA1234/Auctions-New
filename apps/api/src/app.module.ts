import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { FeatureFlagsModule } from './feature-flags/feature-flags.module';

/**
 * Root module wiring the Phase 0 foundations. Domain modules (auction, exchange,
 * commerce, …) are added in later phases behind the same strict boundaries
 * declared in @singha/domain.
 */
@Module({
  imports: [AppConfigModule, PrismaModule, HealthModule, FeatureFlagsModule],
})
export class AppModule {}
