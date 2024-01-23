import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as AWS from 'aws-sdk';
import * as path from 'path';

@Injectable()
export class FileService {
  private s3: AWS.S3;

  constructor(private readonly configService: ConfigService) {
    this.s3 = new AWS.S3({
      region: 'us-east-2',
      accessKeyId: this.configService.get('fileConfig.s3AccessKey'),
      secretAccessKey: this.configService.get('fileConfig.awsS3KeySecret'),
    });
  }

  async upload(image: Express.Multer.File): Promise<string> {
    const { originalname } = image;
    const fileExtName = path.extname(originalname);
    const fileName = `${Date.now().toString()}${fileExtName}`;
    
    const params = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: fileName,
      Body: image.buffer,
      ACL: 'public-read',
    };

    const { Location } = await this.s3.upload(params).promise();
    
    return Location;
  }
}
