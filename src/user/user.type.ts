import { ApiProperty } from '@nestjs/swagger';

export class BtcPrice {
  @ApiProperty({ description: `bitcoin price` })
  price: number;
}

export class TotalSales {
  @ApiProperty({ description: `total sales` })
  totalSales: number;
}
