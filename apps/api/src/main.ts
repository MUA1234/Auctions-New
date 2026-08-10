import 'reflect-metadata';
import { Logger, RequestMethod } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { loadConfig } from '@singha/config';
import { API_VERSION } from '@singha/contracts';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const config = loadConfig();
  const app = await NestFactory.create(AppModule);

  // Versioned API surface (docs/16). Liveness/readiness probes stay at the root.
  app.setGlobalPrefix(`api/${API_VERSION}`, {
    exclude: [
      { path: 'healthz', method: RequestMethod.GET },
      { path: 'readyz', method: RequestMethod.GET },
    ],
  });
  app.enableShutdownHooks();

  await app.listen(config.http.apiPort);
  new Logger('bootstrap').log(
    `Singha API listening on :${config.http.apiPort} (prefix /api/${API_VERSION})`,
  );
}

void bootstrap();
