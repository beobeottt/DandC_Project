import { IsUrl, MaxLength } from 'class-validator';

export class UpdateMatchLiveLinkDto {
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2048)
  liveStreamUrl: string;
}
