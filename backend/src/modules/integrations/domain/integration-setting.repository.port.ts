import type { IntegrationProvider } from "./integration-catalog";

export interface StoredIntegration {
  provider: IntegrationProvider;
  values: Record<string, string>;
  /** clé -> texte chiffré. */
  secrets: Record<string, string>;
  updatedBy: string | null;
  updatedAt: Date;
}

export interface IntegrationSettingRepositoryPort {
  findAll(): Promise<StoredIntegration[]>;
  find(provider: IntegrationProvider): Promise<StoredIntegration | null>;
  save(data: {
    provider: IntegrationProvider;
    values: Record<string, string>;
    secrets: Record<string, string>;
    updatedBy: string;
  }): Promise<void>;
  delete(provider: IntegrationProvider): Promise<void>;
}

export const INTEGRATION_SETTING_REPOSITORY = Symbol("INTEGRATION_SETTING_REPOSITORY");
