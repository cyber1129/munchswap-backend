import { BadRequestException, Injectable } from '@nestjs/common';

import {
  PageDto,
  PageMetaDto,
  PageOptionsDto,
} from '@src/common/pagination/pagination.types';
import { UserService } from '@src/user/user.service';
import { FollowRepository } from './follow.repository';
import { Follow } from './follow.entity';

@Injectable()
export class FollowService {
  constructor(
    private readonly followRepository: FollowRepository,
    private readonly userService: UserService,
  ) {}

  async followUser(
    followerAddress: string,
    followingAddress: string,
  ): Promise<Follow> {
    if (followerAddress === followingAddress)
      throw new BadRequestException('Can not follow the user');

    const followerUser = await this.userService.findByAddress(followerAddress);
    if (!followerUser) throw new BadRequestException('Can not find user');

    const followingUser = await this.userService.findByAddress(
      followingAddress,
    );
    if (!followingUser) throw new BadRequestException('Can not find user');

    const followed = await this.followRepository.findOne({
      where: { followerId: followerUser.id, followingId: followingUser.id },
    });

    if (followed) throw new BadRequestException('You are already followed');

    const follow = this.followRepository.create({
      followerId: followerUser.id,
      followingId: followingUser.id,
    });

    const savedFollow = await this.followRepository.save(follow);

    return this.followRepository.findOne({ where: { id: savedFollow.id } });
  }

  async unFollowUser(
    followerAddress: string,
    followingAddress: string,
  ): Promise<boolean> {
    if (followerAddress === followingAddress)
      throw new BadRequestException('Can not follow the user');

    const followerUser = await this.userService.findByAddress(followerAddress);
    if (!followerUser) throw new BadRequestException('Can not find user');

    const followingUser = await this.userService.findByAddress(
      followingAddress,
    );
    if (!followingUser) throw new BadRequestException('Can not find user');

    const followed = await this.followRepository.findOne({
      where: { followerId: followerUser.id, followingId: followingUser.id },
    });
    if (!followed) throw new BadRequestException('The user is not followed');

    await this.followRepository.delete({ id: followed.id });

    return true;
  }

  async checkIfFollowed(
    followerAddress: string,
    followingAddress: string,
  ): Promise<boolean> {
    const followerUser = await this.userService.findByAddress(followerAddress);
    if (!followerUser) throw new BadRequestException('Can not find user');

    const followingUser = await this.userService.findByAddress(
      followingAddress,
    );
    if (!followingUser) throw new BadRequestException('Can not find user');

    const follow = await this.followRepository.findOne({
      where: { followerId: followerUser.id, followingId: followingUser.id },
    });

    if (follow) return true;

    return false;
  }

  async getFollowingMemberCount(followerAddress: string): Promise<number> {
    const followerUser = await this.userService.findByAddress(followerAddress);
    if (!followerAddress)
      throw new BadRequestException('Can not find the user');

    const followerMemberCount = await this.followRepository.count({
      where: { followerId: followerUser.id },
    });

    return followerMemberCount;
  }

  async getFollowerMemberCount(followingAddress: string): Promise<number> {
    const followingUser = await this.userService.findByAddress(
      followingAddress,
    );
    if (!followingUser) throw new BadRequestException('Can not find the user');

    const followingMemberCount = await this.followRepository.count({
      where: { followingId: followingUser.id },
    });

    return followingMemberCount;
  }

  async getFollowerMembers(
    ownerAddress: string,
    userAddress: string,
    pageOptionsDto: PageOptionsDto,
  ) {
    const [user, owner] = await Promise.all([
      this.userService.findByAddress(userAddress),
      this.userService.findByAddress(ownerAddress),
    ]);

    if (!user) throw new BadRequestException('Can not find the user');

    const followers = await this.followRepository.find({
      select: {
        follower: {
          name: true,
          address: true,
        },
      },
      where: {
        followingId: user.id,
      },
      relations: {
        follower: true,
      },
      skip:
        pageOptionsDto.skip ?? (pageOptionsDto.page - 1) * pageOptionsDto.take,
      take: pageOptionsDto.take,
      order: {
        id: pageOptionsDto.order,
      },
    });

    const promiseIsFollow = followers.map((follower) =>
      this.followRepository.findOne({
        where: { followerId: owner.id, followingId: follower.followerId },
      }),
    );

    const isFollow = await Promise.all(promiseIsFollow);

    const entities = followers.map((follower, i) => {
      return {
        follower: follower.follower,
        isFollow: isFollow[i] ? true : false,
        date: follower.createdAt,
      };
    });

    const itemCount = await this.followRepository
      .createQueryBuilder('follow')
      .where(`following_id=${user.id}`)
      .getCount();

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });

    return new PageDto(entities, pageMetaDto);
  }

  async getFollowingMembers(
    ownerAddress: string,
    userAddress: string,
    pageOptionsDto: PageOptionsDto,
  ) {
    const [user, owner] = await Promise.all([
      this.userService.findByAddress(userAddress),
      this.userService.findByAddress(ownerAddress),
    ]);

    if (!user) throw new BadRequestException('Can not find the user');

    const followings = await this.followRepository.find({
      select: {
        following: {
          name: true,
          address: true,
        },
      },
      where: {
        followerId: user.id,
      },
      relations: {
        following: true,
      },
      skip:
        pageOptionsDto.skip ?? (pageOptionsDto.page - 1) * pageOptionsDto.take,
      take: pageOptionsDto.take,
      order: {
        id: pageOptionsDto.order,
      },
    });

    const promiseIsFollow = followings.map((following) =>
      this.followRepository.findOne({
        where: { followerId: owner.id, followingId: following.followingId },
      }),
    );

    const isFollow = await Promise.all(promiseIsFollow);

    const entities = followings.map((following, i) => {
      return {
        following: following.following,
        isFollow: isFollow[i] ? true : false,
        date: following.createdAt,
      };
    });

    const itemCount = await this.followRepository
      .createQueryBuilder('follow')
      .where(`follower_id=${user.id}`)
      .getCount();

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });

    return new PageDto(entities, pageMetaDto);
  }
}
