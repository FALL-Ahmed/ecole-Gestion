import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config'; // Importez ConfigService

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Active le CORS ici
  app.enableCors({
    origin: configService.get<string>('FRONTEND_URL') || 'http://localhost:8080', 
    credentials: true, // si tu utilises les cookies ou les sessions
  });

  // Le port sera fourni par Render via la variable d'environnement PORT
  const port = configService.get<number>('PORT') || 3000; // Utilisez PORT depuis .env ou Render
  await app.listen(port);}
bootstrap();
