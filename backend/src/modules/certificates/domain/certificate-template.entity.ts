import type { CertificateDesign } from "./certificate-design";

export type { CertificateDesign } from "./certificate-design";

export interface CertificateTemplateProps {
  id: string;
  tenantId: string;
  name: string;
  design: CertificateDesign;
  isDefault: boolean;
  createdAt: Date;
}

/**
 * Entité pure du domaine CertificateTemplate (ENT-38) : aucune dépendance à
 * NestJS ou à l'ORM (section 13.2).
 */
export class CertificateTemplate {
  private constructor(private props: CertificateTemplateProps) {}

  static fromPersistence(props: CertificateTemplateProps): CertificateTemplate {
    return new CertificateTemplate(props);
  }

  get id(): string {
    return this.props.id;
  }

  get tenantId(): string {
    return this.props.tenantId;
  }

  get name(): string {
    return this.props.name;
  }

  get design(): Readonly<CertificateDesign> {
    return this.props.design;
  }

  get isDefault(): boolean {
    return this.props.isDefault;
  }
}
