import 'dotenv/config'

import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'

import { AppModule } from './app.module'
import { GlobalExceptionFilter } from './common/filters/http-exception.filter'
import { TransformInterceptor } from './common/interceptors/transform.interceptor'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173'

  app.enableShutdownHooks()
  app.enableCors({
    credentials: true,
    origin: frontendUrl,
  })
  app.setGlobalPrefix('api')
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  )
  app.useGlobalFilters(new GlobalExceptionFilter())
  app.useGlobalInterceptors(new TransformInterceptor())

  const swaggerConfig = new DocumentBuilder()
    .setTitle(process.env.APP_NAME ?? '2oo3 API')
    .setDescription('Multi-model commissioning investigation API')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build()

  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swaggerConfig))

  await app.listen(process.env.PORT ?? 3000)
}

void bootstrap()
