import { ApiProperty } from '@nestjs/swagger';

export class SearchResult {
  @ApiProperty({ description: `Inscription search result` })
  inscriptions: any[];

  @ApiProperty({ description: `Collection search result` })
  collections: any[];

  @ApiProperty({ description: `User search result` })
  users: any[];
}
