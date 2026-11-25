import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsInt, IsOptional, IsString, Length, Max, MaxLength, Min } from "class-validator";

export class RequestRefundDto {
  @ApiProperty({ description: "Inscription dont l'achat en ligne est à rembourser" })
  @IsString()
  enrollmentId!: string;

  @ApiProperty({ required: false, example: "Formation achetée par erreur" })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

export class AcceptRefundDto {
  @ApiProperty({ required: false, description: "Montant remboursé (partiel). Omis = remboursement intégral." })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1_000_000_000)
  amount?: number;
}

export class DecideRefundDto {
  @ApiProperty({ example: "Progression supérieure à 20 %" })
  @IsString()
  @Length(1, 1000)
  note!: string;
}

export class ListRefundsQueryDto {
  @ApiProperty({ required: false, enum: ["REQUESTED", "ACCEPTED", "REFUNDED", "REJECTED"] })
  @IsOptional()
  @IsIn(["REQUESTED", "ACCEPTED", "REFUNDED", "REJECTED"])
  status?: "REQUESTED" | "ACCEPTED" | "REFUNDED" | "REJECTED";
}
