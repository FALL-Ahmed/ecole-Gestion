import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, UnprocessableEntityException } from '@nestjs/common';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Sécurité
  app.use(helmet());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      // Formate les erreurs pour qu'elles soient plus faciles à utiliser sur le frontend
      exceptionFactory: (errors) => {
        const formattedErrors = errors.reduce((acc: Record<string, string[]>, err) => {
          acc[err.property] = err.constraints ? Object.values(err.constraints) : [];
          return acc;
        }, {});
        // Utilise le statut 422, plus sémantique pour les erreurs de validation
        return new UnprocessableEntityException({
          message: formattedErrors,
          error: 'Unprocessable Entity',
          statusCode: 422,
        });
      },
    }),
  );

  // CORS dynamique
  app.enableCors({
    origin: [
      configService.get('FRONTEND_URL'),
      'http://localhost:8080',
      'https://votre-domaine-production.com'
    ].filter(Boolean),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true
  });

  // Port unifié (utilise PORT plutôt que BACKEND_PORT)
  await app.listen(configService.get('PORT') || 3000);
}

bootstrap();