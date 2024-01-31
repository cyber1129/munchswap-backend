import { registerAs } from '@nestjs/config';

export default registerAs('psbtConfig', () => ({
  feePercent: Number(process.env.FEE_PERCENT),
  adminAddress: process.env.ADMIN_WALLET_ADDRESS,
  network: process.env.NETWORK,
  unisatApiKey: process.env.UNISAT_KEY,
}));
