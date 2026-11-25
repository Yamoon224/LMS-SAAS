import { UsersModule } from "@modules/users/users.module";
import { Module } from "@nestjs/common";


import { ActivateTenantUseCase } from "./application/activate-tenant.use-case";
import { ArchiveTenantUseCase } from "./application/archive-tenant.use-case";
import { CreateTenantUseCase } from "./application/create-tenant.use-case";
import { GetTenantPayoutAccountUseCase, VerifyTenantPayoutAccountUseCase } from "./application/payout-account-admin.use-cases";
import { SuspendTenantUseCase } from "./application/suspend-tenant.use-case";
import {
  GetTenantSettingsUseCase,
  UpdatePayoutAccountUseCase,
  UpdateTenantSettingsUseCase,
} from "./application/tenant-settings.use-cases";
import { UpdateTenantUseCase } from "./application/update-tenant.use-case";
import { UploadTenantLogoUseCase } from "./application/upload-tenant-logo.use-case";
import { LOGO_STORAGE } from "./domain/logo-storage.port";
import { TENANT_REPOSITORY } from "./domain/tenant.repository.port";
import { LocalLogoStorageAdapter } from "./infrastructure/local-logo-storage.adapter";
import { TenantPrismaRepository } from "./infrastructure/tenant.prisma-repository";
import { AdminTenantPayoutAccountController } from "./presentation/admin-tenant-payout-account.controller";
import { BusinessSettingsController } from "./presentation/business-settings.controller";
import { PublicTenantController } from "./presentation/public-tenant.controller";
import { TenantsController } from "./presentation/tenants.controller";
import { TenantsFacade } from "./tenants.facade";

@Module({
  imports: [UsersModule],
  controllers: [TenantsController, PublicTenantController, BusinessSettingsController, AdminTenantPayoutAccountController],
  providers: [
    CreateTenantUseCase,
    SuspendTenantUseCase,
    ActivateTenantUseCase,
    ArchiveTenantUseCase,
    UpdateTenantUseCase,
    UploadTenantLogoUseCase,
    GetTenantSettingsUseCase,
    UpdateTenantSettingsUseCase,
    UpdatePayoutAccountUseCase,
    GetTenantPayoutAccountUseCase,
    VerifyTenantPayoutAccountUseCase,
    TenantsFacade,
    { provide: TENANT_REPOSITORY, useClass: TenantPrismaRepository },
    { provide: LOGO_STORAGE, useClass: LocalLogoStorageAdapter },
  ],
  exports: [TenantsFacade],
})
export class TenantsModule {}
