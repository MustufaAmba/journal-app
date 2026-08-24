import { IsArray, IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateGoalsDto {
  @IsOptional() @IsInt() @Min(0) @Max(1000) booksPerYear?: number;
  @IsOptional() @IsInt() @Min(0) @Max(200) booksPerMonth?: number;
  @IsOptional() @IsInt() @Min(0) @Max(2000) pagesPerDay?: number;
  @IsOptional() @IsInt() @Min(0) @Max(1440) minutesPerDay?: number;
  @IsOptional() @IsInt() @Min(1900) @Max(2200) year?: number;
  @IsOptional() @IsArray() achievements?: Record<string, unknown>[];
}
