/** Moyens de paiement couverts (section 9.2). */
export type PaymentMethod = "CARD" | "ORANGE_MONEY" | "MTN_MOMO" | "MOOV_MONEY" | "WAVE" | "OTHER";

/** Type de vente encaissée (section 4.1, module Payments). */
export type PaymentType = "SUBSCRIPTION" | "CREDIT_PURCHASE" | "COURSE_ENROLLMENT";

export type PaymentStatus = "PENDING" | "SUCCEEDED" | "FAILED" | "REFUNDED" | "PARTIALLY_REFUNDED";
