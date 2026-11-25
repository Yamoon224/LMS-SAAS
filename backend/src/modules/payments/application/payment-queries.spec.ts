import { NotFoundDomainError } from "@shared/errors";

import type { Invoice } from "../domain/invoice";
import type { InvoicePdfRendererPort } from "../domain/invoice-pdf-renderer.port";
import type {
  PaymentProviderConfigRecord,
  PaymentProviderConfigRepositoryPort,
} from "../domain/payment-provider-config.repository.port";
import type { PaymentRepositoryPort } from "../domain/payment.repository.port";

import { GenerateInvoicePdfUseCase } from "./generate-invoice-pdf.use-case";
import { ListAvailableMethodsUseCase } from "./list-available-methods.use-case";
import { ListInvoicesUseCase } from "./list-invoices.use-case";
import { ManageProviderConfigUseCase } from "./manage-provider-config.use-case";

const invoice: Invoice = {
  paymentId: "pay-1",
  number: "FAC-202611-ABCDEF12",
  type: "SUBSCRIPTION",
  method: "CARD",
  status: "SUCCEEDED",
  description: "Abonnement",
  amount: 25000,
  currency: "XOF",
  issuedAt: new Date("2026-11-01T00:00:00Z"),
};

describe("GenerateInvoicePdfUseCase", () => {
  const build = (found: Invoice | null, tenant: { name: string } | null) => {
    const repo = { findInvoice: jest.fn().mockResolvedValue(found) };
    const renderer = { render: jest.fn().mockResolvedValue(Buffer.from("pdf")) };
    const tenants = { findById: jest.fn().mockResolvedValue(tenant) };
    const useCase = new GenerateInvoicePdfUseCase(
      repo as unknown as PaymentRepositoryPort,
      renderer as unknown as InvoicePdfRendererPort,
      tenants as never,
    );
    return { repo, renderer, tenants, useCase };
  };

  it("rend le PDF nommé d'après le numéro de facture avec le nom de l'entreprise", async () => {
    const { repo, renderer, useCase } = build(invoice, { name: "Acme" });
    const pdf = await useCase.execute("tenant-1", "pay-1");
    expect(repo.findInvoice).toHaveBeenCalledWith("tenant-1", "pay-1");
    expect(renderer.render).toHaveBeenCalledWith({ invoice, customerName: "Acme", customerEmail: null });
    expect(pdf.filename).toBe("FAC-202611-ABCDEF12.pdf");
    expect(pdf.content.toString()).toBe("pdf");
  });

  it("utilise le nom générique quand l'entreprise est introuvable", async () => {
    const { renderer, useCase } = build(invoice, null);
    await useCase.execute("tenant-1", "pay-1");
    expect(renderer.render).toHaveBeenCalledWith(expect.objectContaining({ customerName: "Client" }));
  });

  it("lève NotFoundDomainError quand la facture n'appartient pas à l'entreprise", async () => {
    const { renderer, useCase } = build(null, { name: "Acme" });
    await expect(useCase.execute("tenant-1", "pay-x")).rejects.toBeInstanceOf(NotFoundDomainError);
    expect(renderer.render).not.toHaveBeenCalled();
  });
});

describe("ListInvoicesUseCase", () => {
  it("délègue au dépôt pour l'entreprise", async () => {
    const repo = { listInvoices: jest.fn().mockResolvedValue([invoice]) };
    const result = await new ListInvoicesUseCase(repo as unknown as PaymentRepositoryPort).execute("tenant-1");
    expect(result).toEqual([invoice]);
    expect(repo.listInvoices).toHaveBeenCalledWith("tenant-1");
  });
});

const cfg = (over: Partial<PaymentProviderConfigRecord>): PaymentProviderConfigRecord => ({
  id: "c",
  code: "X",
  label: "X",
  isActive: true,
  isTestMode: false,
  priority: 1,
  supportedMethods: [],
  ...over,
});

describe("ListAvailableMethodsUseCase", () => {
  it("renvoie l'union dédoublonnée des moyens des seuls fournisseurs actifs", async () => {
    const repo = {
      listAll: jest.fn().mockResolvedValue([
        cfg({ supportedMethods: ["CARD", "WAVE"] }),
        cfg({ supportedMethods: ["WAVE", "MTN_MOMO"] }),
        cfg({ isActive: false, supportedMethods: ["ORANGE_MONEY"] }),
      ]),
    };
    const methods = await new ListAvailableMethodsUseCase(repo as unknown as PaymentProviderConfigRepositoryPort).execute();
    expect([...methods].sort()).toEqual(["CARD", "MTN_MOMO", "WAVE"]);
  });

  it("renvoie une liste vide sans fournisseur", async () => {
    const repo = { listAll: jest.fn().mockResolvedValue([]) };
    await expect(new ListAvailableMethodsUseCase(repo as unknown as PaymentProviderConfigRepositoryPort).execute()).resolves.toEqual([]);
  });
});

describe("ManageProviderConfigUseCase", () => {
  it("upsert, listAll et setActive délèguent au dépôt", async () => {
    const r = {
      upsert: jest.fn().mockResolvedValue(cfg({ code: "PAYSTACK" })),
      listAll: jest.fn().mockResolvedValue([cfg({ code: "A" })]),
      setActive: jest.fn().mockResolvedValue(undefined),
    };
    const useCase = new ManageProviderConfigUseCase(r as unknown as PaymentProviderConfigRepositoryPort);
    const data = {
      code: "PAYSTACK",
      label: "Paystack",
      isActive: true,
      isTestMode: true,
      priority: 1,
      supportedMethods: ["CARD" as const],
      credentials: { secret: "s" },
    };
    await expect(useCase.upsert(data)).resolves.toMatchObject({ code: "PAYSTACK" });
    expect(r.upsert).toHaveBeenCalledWith(data);
    await expect(useCase.listAll()).resolves.toEqual([cfg({ code: "A" })]);
    await useCase.setActive("PAYSTACK", false);
    expect(r.setActive).toHaveBeenCalledWith("PAYSTACK", false);
  });

  describe("remove", () => {
    const build = (result: { deleted: boolean; paymentCount: number } | null) => {
      const repo = { deleteByCode: jest.fn().mockResolvedValue(result) };
      return { repo, useCase: new ManageProviderConfigUseCase(repo as unknown as PaymentProviderConfigRepositoryPort) };
    };

    it("supprime un fournisseur sans paiement", async () => {
      const { repo, useCase } = build({ deleted: true, paymentCount: 0 });
      await expect(useCase.remove("WAVE")).resolves.toBeUndefined();
      expect(repo.deleteByCode).toHaveBeenCalledWith("WAVE");
    });

    it("refuse de supprimer un fournisseur qui a déjà traité des paiements", async () => {
      const { useCase } = build({ deleted: false, paymentCount: 3 });
      await expect(useCase.remove("WAVE")).rejects.toThrow(/3 paiement/);
    });

    it("signale un fournisseur introuvable", async () => {
      const { useCase } = build(null);
      await expect(useCase.remove("NOPE")).rejects.toThrow("introuvable");
    });
  });
});
