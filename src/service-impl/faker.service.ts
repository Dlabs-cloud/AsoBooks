import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { PortalUserRepository } from '../dao/portal-user.repository';
import { factory } from '../test/factory';
import { PortalUser } from '../domain/entity/portal-user.entity';
import { GenericStatusConstant } from '../domain/enums/generic-status-constant';
import { PortalAccountTypeConstant } from '../domain/enums/portal-account-type-constant';
import { Connection } from 'typeorm/connection/Connection';
import { AuthenticationUtils } from '../common/utils/authentication-utils.service';
import { Association } from '../domain/entity/association.entity';
import { PortalAccount } from '../domain/entity/portal-account.entity';
import { Membership } from '../domain/entity/membership.entity';
import { Group } from '../domain/entity/group.entity';
import { GroupTypeConstant } from '../domain/enums/group-type.constant';
import { GroupMembership } from '../domain/entity/group-membership.entity';
import { Wallet } from '../domain/entity/wallet.entity';
import { PaymentTransaction } from '../domain/entity/payment-transaction.entity';
import { PaymentRequest } from '../domain/entity/payment-request.entity';
import { ActivityLog } from '../domain/entity/activity-log.entity';
import { MembershipInfo } from '../domain/entity/association-member-info.entity';
import { PortalAccountRepository } from '../dao/portal-account.repository';
import { Invoice } from '../domain/entity/invoice.entity';

@Injectable()
export class FakerService implements OnApplicationBootstrap {

  constructor(private readonly connection: Connection,
              private readonly authenticationUtils: AuthenticationUtils) {
  }


  onApplicationBootstrap(): any {
    return this.seed();

  }

  seed() {
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
              return this.getTestUser(GenericStatusConstant.ACTIVE, portalUser, null, PortalAccountTypeConstant.EXECUTIVE_ACCOUNT)
                .then(testUser => {
                  return this.createMembers(testUser.association).then(members => {
                    const paymentTransactions = members.slice(1, 15).map(member => {
                      return this.createPaymentTransactions(member, testUser.association);
                    });
                    return Promise.all(paymentTransactions);
                  }).then(() => {
                    return this.createWallet(testUser.association);
                  }).then(() => {
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

  createWallet(association: Association) {
    return factory().upset(Wallet).use(wallet => {
      wallet.association = association;
      return wallet;
    }).create();
  }

  async createMembers(association) {
    const membershipInfos = await factory().upset(MembershipInfo).use(membershipInfo => {
      membershipInfo.association = association;
      return membershipInfo;
    }).createMany(50);
    let portalAccount = await this.connection.getCustomRepository(PortalAccountRepository)
      .findOne({
        type: PortalAccountTypeConstant.MEMBER_ACCOUNT,
        association: association,
      });
    console.log('Portal Account is this');
    console.log(portalAccount);
    const membershipPromise = membershipInfos.map(membershipInfo => {
      return factory().upset(Membership).use(membership => {
        membership.portalAccount = portalAccount;
        membership.portalUser = membershipInfo.portalUser;
        membership.membershipInfo = membershipInfo;
        return membership;
      }).create();
    });
    return Promise.all(membershipPromise);
  }

  createPaymentTransactions(member: Membership, association: Association) {
    return factory().upset(Invoice).use(invoice => {
      invoice.createdBy = member;
      invoice.association = association;
      return invoice;
    }).create().then(invoice => {
      return factory().upset(PaymentRequest).use(paymenRequest => {
        paymenRequest.association = association;
        paymenRequest.invoice = invoice;
        return paymenRequest;
      }).create();
    }).then(paymentRequest => {
      return factory().upset(PaymentTransaction).use(paymentTransaction => {
        paymentTransaction.paymentRequest = paymentRequest;
        return paymentTransaction;
      }).create();
    });
  }


  getTestUser = async (status?: GenericStatusConstant, portalUser?: PortalUser, association?: Association, accountType = PortalAccountTypeConstant.MEMBER_ACCOUNT) => {
    status = status ?? GenericStatusConstant.ACTIVE;
    association = association ?? await factory().upset(Association).use(association => {
      association.status = status;
      return association;
    }).create();
    const portalAccount = await factory()
      .upset(PortalAccount)
      .use(portalAccount => {
        portalAccount.status = status;
        portalAccount.association = association;
        portalAccount.type = PortalAccountTypeConstant.EXECUTIVE_ACCOUNT;
        return portalAccount;
      }).create().then((executiveAccount) => {
        return factory().upset(PortalAccount).use(portalAccount => {
          portalAccount.status = status;
          portalAccount.association = association;
          portalAccount.type = PortalAccountTypeConstant.MEMBER_ACCOUNT;
          return portalAccount;
        }).create().then(membershipExecutive => {
          const portalAccount = [executiveAccount, membershipExecutive]
            .find(paccount => paccount.type === accountType);
          return Promise.resolve(portalAccount);
        });
      });
    portalUser = portalUser ?? await factory().upset(PortalUser).use(portalUser => {
      portalUser.status = status;
      return portalUser;
    }).create();

    let membership = await (factory()
      .upset(Membership)
      .use(membership => {
        membership.portalAccount = portalAccount;
        membership.portalUser = portalUser;
        membership.status = status;
        return membership;
      }).create());
    let group = await factory().upset(Group).use(group => {
      group.association = association;
      group.type = GroupTypeConstant.GENERAL;
      return group;
    }).create();
    await factory().upset(GroupMembership).use(membershipGroup => {
      membershipGroup.membership = membership;
      membershipGroup.group = group;
      return membershipGroup;
    }).create();

    return { membership, association };
  };


}