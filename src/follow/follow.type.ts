import { ApiProperty } from '@nestjs/swagger';

export class FollowUserResult {
  @ApiProperty({ description: `Result message` })
  msg: string;
}

export class CheckUserFollowed {
  @ApiProperty({ description: `If user followed an user` })
  res: boolean;
}

export class FollowCount {
  @ApiProperty({ description: `Number of follow members` })
  follower: number;

  @ApiProperty({ description: `Number of following members` })
  following: number;
}

export class FollowUserInfo {
  @ApiProperty({ description: `User name` })
  name: string;

  @ApiProperty({ description: `User address` })
  address: string;
}

export class FollowerInfo {
  @ApiProperty({ description: `Follower info` })
  follower: FollowUserInfo;

  @ApiProperty({ description: `Is user followed` })
  isFollow: boolean;

  @ApiProperty({ description: `Followed date` })
  date: string;
}

export class FollowingInfo {
  @ApiProperty({ description: `Follower info` })
  following: FollowUserInfo;

  @ApiProperty({ description: `Is user followed` })
  isFollow: boolean;

  @ApiProperty({ description: `Followed date` })
  date: string;
}
