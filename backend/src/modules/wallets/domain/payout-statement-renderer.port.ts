import type { PayoutStatementData } from "./payout-statement";

export interface PayoutStatementRendererPort {
  render(data: PayoutStatementData): Promise<Buffer>;
}

export const PAYOUT_STATEMENT_RENDERER = Symbol("PAYOUT_STATEMENT_RENDERER");
