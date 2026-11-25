import { Body, Controller, Get, Patch } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser, RequirePermissions } from "@shared/decorators";
import type { AuthenticatedUser } from "@shared/decorators/current-user.decorator";

import { GetOwnProfileUseCase } from "../application/get-own-profile.use-case";
import { UpdateOwnProfileUseCase } from "../application/update-own-profile.use-case";

import { UpdateOwnProfileDto } from "./dto/update-own-profile.dto";

/** PUB-04 : profil de l'apprenant connecté. L'identité vient du jeton ; aucun identifiant n'est accepté en entrée. */
@ApiTags("Plateforme publique / Compte apprenant")
@Controller("public/account")
export class PublicAccountController {
  constructor(
    private readonly getOwnProfileUseCase: GetOwnProfileUseCase,
    private readonly updateOwnProfileUseCase: UpdateOwnProfileUseCase,
  ) {}

  @Get("me")
  @RequirePermissions("learner.view-own-enrollments")
  @ApiOperation({ summary: "Mon profil (PUB-04)" })
  async me(@CurrentUser() user: AuthenticatedUser) {
    return this.getOwnProfileUseCase.execute(user.userId);
  }

  @Patch("me")
  @RequirePermissions("learner.view-own-enrollments")
  @ApiOperation({ summary: "Modifier mon profil : nom, téléphone, langue (PUB-04)" })
  async updateMe(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateOwnProfileDto) {
    // Liste blanche explicite : ne transmettre que les champs autorisés, jamais le DTO brut.
    await this.updateOwnProfileUseCase.execute(user.userId, {
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      locale: dto.locale,
    });
    return this.getOwnProfileUseCase.execute(user.userId);
  }
}
