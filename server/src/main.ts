import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    // Without this Nest logs the raw error and exits on its own, so the
    // explanation below never gets a chance to run.
    abortOnError: false,
  });
  const config = app.get(ConfigService);
  const logger = new Logger('Marginalia');

  // Managed hosts (Render, Fly, Railway) put a proxy in front of the app.
  // Without this every request looks like it came from the proxy, so
  // rate limiting would apply to all readers as though they were one.
  app.set('trust proxy', 1);

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
}

/**
 * Turns the two connection failures that actually happen in practice into one
 * readable line.
 *
 * Atlas is unhelpful here: a non-allowlisted IP is refused during the TLS
 * handshake, so the driver reports a certificate error, and a bad host is
 * reported as an allowlist problem. Both send you looking in the wrong place.
 */
function explainStartupFailure(error: unknown): string | null {
  const message = error instanceof Error ? `${error.message}\n${error.stack ?? ''}` : String(error);

  if (/tlsv1 alert internal error|ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR|SSL alert number 80/i.test(message)) {
    return [
      'MongoDB refused the connection during the TLS handshake.',
      'This is almost always the Atlas IP access list, not a certificate problem.',
      '',
      '  Atlas → Network Access → Add IP Address → Allow access from anywhere (0.0.0.0/0)',
      '',
      'Render has no fixed outbound IP, so there is nothing narrower to allow.',
      'Wait for the entry to turn Active (about a minute), then redeploy.',
      'If it is already there, check the cluster is not Paused.',
    ].join('\n  ');
  }

  if (/ENOTFOUND|querySrv|EAI_AGAIN/i.test(message)) {
    return [
      'The MongoDB hostname does not resolve, so the connection string is wrong.',
      'In Atlas use Connect → Drivers and copy the whole string; the host should',
      'look like cluster0.xxxxx.mongodb.net.',
    ].join('\n  ');
  }

  if (/MongooseServerSelectionError|Could not connect to any servers|ECONNREFUSED/i.test(message)) {
    return [
      'Could not reach MongoDB.',
      'Check, in this order:',
      '  1. Atlas → Network Access allows 0.0.0.0/0 and shows Active',
      '  2. The cluster is running, not Paused',
      '  3. MONGODB_URI came from Connect → Drivers (host looks like',
      '     cluster0.xxxxx.mongodb.net, not atlas-sql-....query.mongodb.net)',
      '  4. The username and password are right, and any special characters',
      '     in the password are percent-encoded',
    ].join('\n  ');
  }

  return null;
}

void bootstrap().catch((error: unknown) => {
  const logger = new Logger('Marginalia');
  const hint = explainStartupFailure(error);

  if (hint) {
    // One clear paragraph instead of a topology dump.
    logger.error(`Cannot start.\n  ${hint}`);
  } else {
    // Anything unrecognised still gets the full stack — better a wall of text
    // than a swallowed error.
    logger.error('Cannot start.', error instanceof Error ? error.stack : String(error));
  }

  process.exit(1);
});
