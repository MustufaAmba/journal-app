import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);
  const logger = new Logger('Marginalia');

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  const origins = config.get<string[]>('corsOrigins') ?? [];
  app.enableCors({
    // A mobile app sends no Origin header, so an empty allow-list means
    // "phones only". Anything listed is additionally allowed for web/dev.
    origin: origins.length ? origins : true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();

  const port = config.get<number>('port') ?? 4000;
  await app.listen(port, '0.0.0.0');

  logger.log(`Marginalia is listening on http://localhost:${port}`);
  logger.log(`Database: ${config.get<string>('mongo.uri')}`);
  if (!config.get<string>('google.clientId')) {
    logger.log('Google sign-in is off (no GOOGLE_CLIENT_ID) — email and guest mode still work.');
  }
}

void bootstrap();
