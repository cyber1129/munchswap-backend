import { registerAs } from '@nestjs/config';
import path = require('path');

export default registerAs('redisConfig', () => ({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
}));
