import { DynamicModule, Module } from '@nestjs/common';
import { IpfsClient } from './ipfs-client';
import {
  IPFS_CLIENT_MODULE_OPTIONS,
  type IpfsClientModuleOptions,
} from './ipfs-client.options';

@Module({})
export class IpfsClientModule {
  static forRoot(options: IpfsClientModuleOptions): DynamicModule {
    return {
      module: IpfsClientModule,
      global: true,
      providers: [
        { provide: IPFS_CLIENT_MODULE_OPTIONS, useValue: options },
        IpfsClient,
      ],
      exports: [IpfsClient],
    };
  }

  static forRootAsync(options: {
    useFactory: (
      ...args: any[]
    ) => IpfsClientModuleOptions | Promise<IpfsClientModuleOptions>;
    inject?: any[];
    imports?: any[];
  }): DynamicModule {
    return {
      module: IpfsClientModule,
      global: true,
      imports: options.imports || [],
      providers: [
        {
          provide: IPFS_CLIENT_MODULE_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        IpfsClient,
      ],
      exports: [IpfsClient],
    };
  }
}
