import type { UserType } from "@shared/domain/user-type";
import { InvalidStateTransitionError } from "@shared/errors";

import { canTransitionUserStatus, UserStatus } from "./user-status";

export interface UserProps {
  id: string;
  tenantId: string | null;
  type: UserType;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  locale: string;
  status: UserStatus;
  roleIds: string[];
  createdAt: Date;
}

/**
 * Entité pure du domaine User : aucune dépendance à NestJS ou à l'ORM
 * (section 13.2). Porte les règles de cycle de vie du compte.
 */
export class User {
  private constructor(private props: UserProps) {}

  static fromPersistence(props: UserProps): User {
    return new User(props);
  }

  get id(): string {
    return this.props.id;
  }

  get type(): UserType {
    return this.props.type;
  }

  get tenantId(): string | null {
    return this.props.tenantId;
  }

  get email(): string {
    return this.props.email;
  }

  get phone(): string | null {
    return this.props.phone;
  }

  get locale(): string {
    return this.props.locale;
  }

  get firstName(): string {
    return this.props.firstName;
  }

  get lastName(): string {
    return this.props.lastName;
  }

  get fullName(): string {
    return `${this.props.firstName} ${this.props.lastName}`.trim();
  }

  get status(): UserStatus {
    return this.props.status;
  }

  get roleIds(): readonly string[] {
    return this.props.roleIds;
  }

  isActive(): boolean {
    return this.props.status === UserStatus.ACTIVE;
  }

  /** ADM-05 / ENT-10: activation du compte suite à l'utilisation du lien reçu par e-mail. */
  activate(): UserStatus {
    if (!canTransitionUserStatus(this.props.status, UserStatus.ACTIVE)) {
      throw new InvalidStateTransitionError(
        `Impossible d'activer un compte au statut ${this.props.status}.`,
      );
    }
    this.props.status = UserStatus.ACTIVE;
    return this.props.status;
  }

  suspend(): UserStatus {
    if (!canTransitionUserStatus(this.props.status, UserStatus.SUSPENDED)) {
      throw new InvalidStateTransitionError(
        `Impossible de suspendre un compte au statut ${this.props.status}.`,
      );
    }
    this.props.status = UserStatus.SUSPENDED;
    return this.props.status;
  }

  reactivate(): UserStatus {
    if (!canTransitionUserStatus(this.props.status, UserStatus.ACTIVE)) {
      throw new InvalidStateTransitionError(
        `Impossible de réactiver un compte au statut ${this.props.status}.`,
      );
    }
    this.props.status = UserStatus.ACTIVE;
    return this.props.status;
  }

  deactivate(): UserStatus {
    if (!canTransitionUserStatus(this.props.status, UserStatus.DEACTIVATED)) {
      throw new InvalidStateTransitionError(
        `Impossible de désactiver un compte au statut ${this.props.status}.`,
      );
    }
    this.props.status = UserStatus.DEACTIVATED;
    return this.props.status;
  }
}
