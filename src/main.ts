import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import helmet from '@fastify/helmet';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import {
  DocumentBuilder,
  SwaggerDocumentOptions,
  SwaggerModule,
} from '@nestjs/swagger';
import fmp = require('@fastify/multipart');
import compression from '@fastify/compress';
import { useContainer } from 'class-validator';
import { camelCase, startCase } from 'lodash';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { DEFAULT_PORT } from './utils/constants';

// TODO: for development only
const CORS_OPTIONS = {
  origin: [],
  allowedHeaders: [
    'Access-Control-Allow-Origin',
    'Origin',
    'X-Requested-With',
    'Accept',
    'Content-Type',
    'Authorization',
    'key',
  ],
  exposedHeaders: 'Authorization',
  credentials: true,
  methods: ['GET', 'PUT', 'PATCH', 'OPTIONS', 'POST', 'DELETE'],
};

async function bootstrap() {
  const adapter = new FastifyAdapter();
  adapter.enableCors(CORS_OPTIONS);
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter,
    {
      bufferLogs: true,
      rawBody: true,
    },
  );

  app.useWebSocketAdapter(new IoAdapter(app));

  // app.useLogger(app.get(Logger));

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  await app.register(compression);

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  await app.register(helmet);

  app.enableVersioning({
    type: VersioningType.URI,
  });

  app.setGlobalPrefix('api/v2');

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      whitelist: true,
      forbidUnknownValues: true,
    }),
  );

  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  await app.register(fmp, {
    limits: {
      fileSize: 200 * 1024 * 1024,
    },
  });

  const config = new DocumentBuilder()
    .setTitle('API Gateway microservices')
    .addBearerAuth()
    .setVersion('1.0')
    .build();
  const options: SwaggerDocumentOptions = {
    operationIdFactory: (controllerKey: string, methodKey: string) => {
      return `${controllerKey
        .toLowerCase()
        .replace('controller', '')}${startCase(camelCase(methodKey)).replace(
        / /g,
        '',
      )}`;
    },
  };
  const document = SwaggerModule.createDocument(app, config, options);
  SwaggerModule.setup('swagger', app, document, {
    swaggerOptions: {
      displayOperationId: true,
      docExpansion: 'none',
    },
  });

  const configService = app.get(ConfigService);

  const port = configService.get('PORT');
  const host = configService.get('HOST');

  const server = await app.listen(port || DEFAULT_PORT, host);
  console.log(
    `[Api Gateway] Listening on port ${port} on ${await app.getUrl()}`,
  );
  server.setTimeout(1000 * 60 * 2);
}
bootstrap();
