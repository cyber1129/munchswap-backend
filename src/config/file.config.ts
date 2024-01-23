import { registerAs } from '@nestjs/config';

export default registerAs('fileConfig', () => ({
  s3AccessKey: process.env.AWS_S3_ACCESS_KEY,
  awsS3KeySecret: process.env.AWS_S3_KEY_SECRET,
  awsS3Bucket: process.env.AWS_S3_BUCKET,
}));
