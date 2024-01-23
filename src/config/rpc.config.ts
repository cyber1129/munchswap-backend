import { registerAs } from '@nestjs/config';

export default registerAs('rpcConfig', () => ({
  rpcHost: process.env.RPC_HOST,
  rpcPort: Number(process.env.RPC_PORT),
  rpcUserName: process.env.RPC_USERNAME,
  rpcPassword: process.env.RPC_PASSWORD,
}));
