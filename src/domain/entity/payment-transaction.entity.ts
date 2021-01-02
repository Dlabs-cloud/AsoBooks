import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { PaymentRequest } from './payment-request.entity';
import { BaseEntity } from '../../common/base.entity';
import { PaymentChannel } from '../enums/payment-channel.enum';


@Entity()
export class PaymentTransaction extends BaseEntity {
  @Column({
    type: 'bigint',
  })
  amountInUnit: number;
  @Column({
    type: 'enum',
    enum: PaymentChannel,
  })
  paymentChannel: PaymentChannel;
  @Column({
    type: 'timestamp',
  })
  datePaid: Date;

  @OneToOne(() => PaymentRequest)
  @JoinColumn({ name: 'paymentRequestId' })
  paymentRequest: PaymentRequest;

}