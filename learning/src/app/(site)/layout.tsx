import { MobileNav } from "@/components/layout/MobileNav";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { LegalAcceptanceGate } from "@/features/legal/components/LegalAcceptanceGate";
import { OfflineInstructionsProvider } from "@/features/tenant/components/OfflineInstructions";
import { getTenantProfile } from "@/features/tenant/tenant.server";
import { TenantNameProvider } from "@/features/tenant/TenantNameContext";
import { LOCALES } from "@/lib/i18n/locales";
import { getCopy, getEnabledLocales } from "@/lib/i18n/server";
import { hasSession } from "@/lib/session";

/** Coque publique : en-tête, contenu, pied de page ; barre basse mobile si connecté. */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [authenticated, tenant, copy, enabledLocales] = await Promise.all([
    hasSession(),
    getTenantProfile(),
    getCopy(),
    getEnabledLocales(),
  ]);
  const tenantName = tenant.name;

  return (
    <TenantNameProvider name={tenantName}>
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-card focus:px-4 focus:py-3 focus:shadow-lift"
      >
        {copy.nav.skip}
      </a>
      <SiteHeader
        tenantName={tenantName}
        logoUrl={tenant.logoUrl}
        authenticated={authenticated}
        locales={enabledLocales ?? [...LOCALES]}
      />
      <main id="main" className={`mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-10 ${authenticated ? "pb-24 md:pb-10" : ""}`}>
        <OfflineInstructionsProvider instructions={tenant.offlinePaymentInstructions}>{children}</OfflineInstructionsProvider>
      </main>
      <SiteFooter tenantName={tenantName} />
      {authenticated && <MobileNav />}
      <LegalAcceptanceGate authenticated={authenticated} />
    </div>
    </TenantNameProvider>
  );
}
