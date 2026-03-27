import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { IpfsClientModule } from '@opden-data-layer/clients';
import {
  ContentController,
  FilesController,
  NamespacesController,
  UploadController,
} from './controllers';
import { GatewayReadService } from './domain/gateway-read.service';
import { ImageProcessorService } from './domain/image-processor.service';
import { MfsInitService } from './domain/mfs-init.service';
import { PinSyncService } from './domain/pin-sync.service';
import ipfsGatewayConfig from './config/ipfs-gateway.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [ipfsGatewayConfig],
    }),
    ScheduleModule.forRoot(),
    IpfsClientModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        apiUrl: config.get<string>('ipfs.apiUrl', 'http://localhost:5001'),
        gatewayUrl: config.get<string | undefined>('ipfs.gatewayUrl'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [
    UploadController,
    FilesController,
    ContentController,
    NamespacesController,
  ],
  providers: [
    ImageProcessorService,
    MfsInitService,
    PinSyncService,
    GatewayReadService,
  ],
})
export class MainModule {}
