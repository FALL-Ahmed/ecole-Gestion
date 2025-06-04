import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Active le CORS ici
  app.enableCors({
    origin: 'http://localhost:8080', // ou ['http://localhost:8080'] pour plusieurs
    credentials: true, // si tu utilises les cookies ou les sessions
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
