import "reflect-metadata";

import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { logoRoutePath, logoStorageDir } from "@modules/tenants/infrastructure/local-logo-storage.adapter";
import { initSentry } from "@shared/observability/sentry";
import { rawBodyMiddleware } from "@shared/middleware/raw-body.middleware";
import * as express from "express";
import helmet from "helmet";


import { AppModule } from "./app.module";

/**
 * Point d'entrée du backend NestJS (section 4). API versionnée (/v1, BE-10),
 * validation stricte des DTO (BE-09), documentation OpenAPI/Swagger générée.
 *
 * Le bodyParser automatique de Nest est désactivé pour pouvoir brancher le
 * corps brut (Buffer) sur les routes de webhook de paiement avant tout
 * parsing JSON (BE-05, vérification de signature HMAC) — voir
 * shared/middleware/raw-body.middleware.ts.
 */
async function bootstrap(): Promise<void> {
  initSentry();
  const app = await NestFactory.create(AppModule, { bufferLogs: true, bodyParser: false });

  const apiPrefix = process.env.API_PREFIX ?? "v1";

  app.use(`/${apiPrefix}/payments/webhooks`, rawBodyMiddleware());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use(helmet());

  // Logos d'entreprise : fichiers publics en lecture seule, affichables depuis les autres origines (admin, entreprise, apprenant).
  app.use(
    logoRoutePath(),
    express.static(logoStorageDir(), {
      maxAge: "1d",
      index: false,
      setHeaders: (response) => {
        response.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
        response.setHeader("X-Content-Type-Options", "nosniff");
        response.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
      },
    }),
  );
  app.enableCors({ origin: true, credentials: true });

  app.setGlobalPrefix(apiPrefix);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle("SaaS LMS API")
    .setDescription("Backend NestJS — Plateforme SaaS LMS multi-entreprises")
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${apiPrefix}/docs`, app, document);

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`🚀 Backend API démarré sur http://localhost:${port}/${apiPrefix}`);
}

void bootstrap();
