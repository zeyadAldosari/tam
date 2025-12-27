import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { TaskModule } from './task/task.module';
import { AuthModule } from './auth/auth.module';
import { TaskController } from './task/task.controller';
import { UserService } from './user/user.service';
import { TaskService } from './task/task.service';
import { PrismaModule } from './prisma.module';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'frontend'),
    }),
    PrismaModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    UserModule,
    TaskModule,
    AuthModule,
  ],
  controllers: [AppController, TaskController],
  providers: [AppService, UserService, TaskService],
})
export class AppModule {}
