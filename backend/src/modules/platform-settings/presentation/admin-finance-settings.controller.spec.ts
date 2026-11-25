import { PERMISSIONS_KEY } from "@shared/decorators/permissions.decorator";

import { AdminFinanceSettingsController } from "./admin-finance-settings.controller";

describe("AdminFinanceSettingsController — permission", () => {
  it.each(["get", "update", "history"] as const)("la route %s exige finance-settings.manage", (method) => {
    const permissions = Reflect.getMetadata(PERMISSIONS_KEY, AdminFinanceSettingsController.prototype[method]) as string[];
    expect(permissions).toEqual(["finance-settings.manage"]);
  });
});
