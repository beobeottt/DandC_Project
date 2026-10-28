import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'node:path';
import { AppModule, ObserveInstrument } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    instrument: ObserveInstrument,
  });
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
