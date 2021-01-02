import { INestApplication } from '@nestjs/common';
import { Connection } from 'typeorm/connection/Connection';
import { TestingModule } from '@nestjs/testing';
import { baseTestingModule, getAssociationUser } from './test-utils';
import { ValidatorTransformPipe } from '../conf/validator-transform.pipe';
import { getConnection } from 'typeorm';
import { factory } from './factory';
import { Membership } from '../domain/entity/membership.entity';
import { Bill } from '../domain/entity/bill.entity';
import { GenericStatusConstant } from '../domain/enums/generic-status-constant';
import * as request from 'supertest';

describe('membership-bills', () => {

  let applicationContext: INestApplication;
  let connection: Connection;
  let associationUser;


  beforeAll(async () => {
    const moduleRef: TestingModule = await baseTestingModule().compile();
    applicationContext = moduleRef.createNestApplication();
    applicationContext.useGlobalPipes(new ValidatorTransformPipe());
    await applicationContext.init();
    connection = getConnection();

  });


  it('test that a logged in user can get all its bills', async () => {
    let membership = await factory().create(Membership);
    await factory().upset(Bill).use(bill => {
      bill.membership = membership;
      return bill;
    }).createMany(3);

    return getAssociationUser(GenericStatusConstant.ACTIVE, membership.portalUser, membership.portalAccount.association).then(associationUser => {
      return request(applicationContext.getHttpServer())
        .get(`/member-bills`)
        .set('Authorization', associationUser.token)
        .set('X-ASSOCIATION-IDENTIFIER', associationUser.association.code)
        .expect(200).then(response => {
          let data = response.body.data;
          expect(data.total).toBe(3);
          expect(data.items[0]).toHaveProperty('id');
          expect(data.items[0]).toHaveProperty('status');
          expect(data.items[0]).toHaveProperty('createdAt');
          expect(data.items[0]).toHaveProperty('updatedAt');
          expect(data.items[0]).toHaveProperty('code');
          expect(data.items[0]).toHaveProperty('currentAmountInMinorUnit');
          expect(data.items[0]).toHaveProperty('description');
          expect(data.items[0]).toHaveProperty('vatInPercentage');
          expect(data.items[0]).toHaveProperty('disCountInPercentage');
          expect(data.items[0]).toHaveProperty('payableAmountInMinorUnit');
          expect(data.items[0]).toHaveProperty('totalAmountPaidInMinorUnit');
          expect(data.items[0]).toHaveProperty('paymentStatus');
          expect(data.items[0]).toHaveProperty('lastDispatchDate');
          expect(data.items[0].subscription).toBeDefined();
        });
    });

  });

});