import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { PortalUserRepository } from '../dao/portal-user.repository';
import { factory } from '../test/factory';
import { PortalUser } from '../domain/entity/portal-user.entity';
import { getTestUser } from '../test/test-utils';
import { GenericStatusConstant } from '../domain/enums/generic-status-constant';
import { PortalAccountTypeConstant } from '../domain/enums/portal-account-type-constant';
import { PaymentRequest } from '../domain/entity/payment-request.entity';
import { PaymentTransaction } from '../domain/entity/payment-transaction.entity';
import { Connection } from 'typeorm/connection/Connection';
import { AuthenticationUtils } from '../common/utils/authentication-utils.service';
import { Association } from '../domain/entity/association.entity';
import { ActivityLog } from '../domain/entity/activity-log.entity';

@Injectable()
export class FakerService implements OnApplicationBootstrap {

  constructor(private readonly connection: Connection,
              private readonly authenticationUtils: AuthenticationUtils) {
  }

  onApplicationBootstrap(): any {
    const email = 'seeders@asobooks.com';
    return this.connection.getCustomRepository(PortalUserRepository)
      .findByUserNameOrEmailOrPhoneNumberAndNotDeleted(email).then(poralUser => {
        if (!poralUser) {
          return this.authenticationUtils
            .hashPassword('asobooks')
            .then(hash => {
              return factory().upset(PortalUser).use(pUser => {
                pUser.email = 'seeders@asobooks.com';
                pUser.password = hash;
                return pUser;
              }).create();
            }).then(portalUser => {
              return getTestUser(GenericStatusConstant.ACTIVE, portalUser, null, PortalAccountTypeConstant.EXECUTIVE_ACCOUNT)
                .then(testUser => {
                  return this.seedPaymentTransactions(testUser.association)
                    .then(() => {
                      return this.seedActivityLog(testUser.association);
                    });
                });
            });
        }
      });

  }

  seedActivityLog(association: Association) {
    return factory().upset(ActivityLog).use(activityLog => {
      activityLog.association = association;
      return activityLog;
    }).createMany(50);
  }


  async seedPaymentTransactions(association) {
    const paymentRequests = await factory().upset(PaymentRequest).use(paymentRequest => {
      paymentRequest.association = association;
      return paymentRequest;
    }).createMany(50);
    for (let i = 0; i < paymentRequests.length; i++) {
      const paymentRequest = paymentRequests[i];
      await factory().upset(PaymentTransaction).use(pTransaction => {
        pTransaction.paymentRequest = paymentRequest;
        return pTransaction;
      }).create();
    }

  }


}