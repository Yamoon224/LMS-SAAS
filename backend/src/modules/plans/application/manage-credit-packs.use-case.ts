import { Inject, Injectable } from "@nestjs/common";
import { NotFoundDomainError } from "@shared/errors";

import { CREDIT_PACK_REPOSITORY } from "../domain/credit-pack.repository.port";
import type {
  CreateCreditPackData,
  CreditPackRecord,
  CreditPackRepositoryPort,
} from "../domain/credit-pack.repository.port";

/** ADM-18: définir des packs de crédits IA et leur prix. */
@Injectable()
export class ManageCreditPacksUseCase {
  constructor(
    @Inject(CREDIT_PACK_REPOSITORY) private readonly creditPackRepository: CreditPackRepositoryPort,
  ) {}

  async create(data: CreateCreditPackData): Promise<CreditPackRecord> {
    return this.creditPackRepository.create(data);
  }

  async archive(id: string): Promise<void> {
    const pack = await this.creditPackRepository.findById(id);
    if (!pack) {
      throw new NotFoundDomainError(`Pack de crédits introuvable: ${id}`);
    }
    await this.creditPackRepository.archive(id);
  }

  async listActive(): Promise<CreditPackRecord[]> {
    return this.creditPackRepository.listActive();
  }

  /** ADM-18: vue Admin incluant les packs archivés. */
  async listAll(): Promise<CreditPackRecord[]> {
    return this.creditPackRepository.listAll();
  }
}
