import { Controller, Get } from "@nestjs/common";
import { ApiExcludeEndpoint } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";
import { Public } from "@shared/decorators";

/** Sonde de vivacité (Docker HEALTHCHECK, reverse proxy) : publique, sans accès base ni Redis. */
@Controller("health")
export class LivenessController {
  @Public()
  @SkipThrottle()
  @Get()
  @ApiExcludeEndpoint()
  live(): { status: "ok" } {
    return { status: "ok" };
  }
}
