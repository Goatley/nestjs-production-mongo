import { Module, Logger } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';

//import modules
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { OrganizationModule } from './organization/organization.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env'
    }),
    EventEmitterModule.forRoot(),
    AuthModule,
    UserModule,
    OrganizationModule, 
    DatabaseModule,
  ],
  controllers: [],
  providers: [Logger, AppService],
})
export class AppModule {}
