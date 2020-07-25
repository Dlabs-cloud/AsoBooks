import { BankUploadStartup } from '../../core/start-ups/bank-upload.startup';
import { factory } from '../factory';
import { Bank } from '../../domain/entity/bank.entity';
import { Injectable } from '@nestjs/common';
import { IllegalArgumentException } from '../../exception/illegal-argument.exception';

@Injectable()
export class BankUploadStartupMock extends BankUploadStartup {

  async onApplicationBootstrap(): Promise<void> {
    console.log('overring instead');
    try {
      await factory().createMany(2, Bank);
    } catch (e) {
      throw e;
    }

  }
}