import { BadRequestException, Injectable } from '@nestjs/common';

import {
  PageDto,
  PageMetaDto,
  PageOptionsDto,
} from '@src/common/pagination/pagination.types';
import { UserService } from '@src/user/user.service';
import { FriendRepository } from './friend.repository';
import { FriendStatus } from './friend.entity';

@Injectable()
export class FriendService {
  constructor(
    private readonly friendRepository: FriendRepository,
    private readonly userService: UserService,
  ) {}

  async sendFriendRequest(
    senderAddress: string,
    receiverAddress: string,
  ): Promise<{ msg: string }> {
    const [sender, receiver] = await Promise.all([
      this.userService.findByAddress(senderAddress),
      this.userService.findByAddress(receiverAddress),
    ]);

    if (!sender) throw new BadRequestException('Can not find the user address');
    if (!receiver)
      throw new BadRequestException('Can not find the user address');

    const friend = this.friendRepository.create({
      senderId: sender.id,
      receiverId: receiver.id,
      status: FriendStatus.PENDING,
    });

    await this.friendRepository.save(friend);

    return { msg: 'Successfully send a friend request' };
  }

  async acceptFriendRequest(
    senderAddress: string,
    receiverAddress: string,
  ): Promise<{ msg: string }> {
    const [sender, receiver] = await Promise.all([
      this.userService.findByAddress(senderAddress),
      this.userService.findByAddress(receiverAddress),
    ]);

    if (!sender) throw new BadRequestException('Can not find the user address');
    if (!receiver)
      throw new BadRequestException('Can not find the user address');

    const friend = await this.friendRepository.findOne({
      where: { senderId: sender.id, receiverId: receiver.id },
    });

    if (!friend)
      throw new BadRequestException('Can not find the friend request');

    await this.friendRepository.update(
      { id: friend.id },
      { status: FriendStatus.ACCEPTED },
    );

    return { msg: 'Successfully accepted a friend request' };
  }

  async ignoreFriendRequest(
    senderAddress: string,
    receiverAddress: string,
  ): Promise<{ msg: string }> {
    const [sender, receiver] = await Promise.all([
      this.userService.findByAddress(senderAddress),
      this.userService.findByAddress(receiverAddress),
    ]);

    if (!sender) throw new BadRequestException('Can not find the user address');
    if (!receiver)
      throw new BadRequestException('Can not find the user address');

    const friend = await this.friendRepository.findOne({
      where: { senderId: sender.id, receiverId: receiver.id },
    });
    
    if (!friend)
      throw new BadRequestException('Can not find the friend request');

    await this.friendRepository.update(
      { id: friend.id },
      { status: FriendStatus.IGNORE },
    );

    return { msg: 'Successfully ignored a friend request' };
  }

  async blockFriendRequest(
    senderAddress: string,
    receiverAddress: string,
  ): Promise<{ msg: string }> {
    const [sender, receiver] = await Promise.all([
      this.userService.findByAddress(senderAddress),
      this.userService.findByAddress(receiverAddress),
    ]);

    if (!sender) throw new BadRequestException('Can not find the user address');
    if (!receiver)
      throw new BadRequestException('Can not find the user address');

    const friend = await this.friendRepository.findOne({
      where: { senderId: sender.id, receiverId: receiver.id },
    });
    
    if (!friend)
      throw new BadRequestException('Can not find the friend request');

    await this.friendRepository.update(
      { id: friend.id },
      { status: FriendStatus.BLOCKED },
    );

    return { msg: 'Successfully blocked a friend request' };
  }

  async unblockFriendRequest(
    senderAddress: string,
    receiverAddress: string,
  ): Promise<{ msg: string }> {
    const [sender, receiver] = await Promise.all([
      this.userService.findByAddress(senderAddress),
      this.userService.findByAddress(receiverAddress),
    ]);

    if (!sender) throw new BadRequestException('Can not find the user address');
    if (!receiver)
      throw new BadRequestException('Can not find the user address');

    const friend = await this.friendRepository.findOne({
      where: { senderId: sender.id, receiverId: receiver.id },
    });
    
    if (!friend)
      throw new BadRequestException('Can not find the friend request');

    await this.friendRepository.update(
      { id: friend.id },
      { status: FriendStatus.UNBLOCK },
    );

    return { msg: 'Successfully unblocked a friend request' };
  }

  async getFriends(userAddress: string, pageOptionsDto: PageOptionsDto) {
    const [entities, itemCount] = await this.friendRepository.findAndCount({
      where: [
        {
          sender: {
            address: userAddress,
          },
          status: FriendStatus.ACCEPTED,
        },
        {
          receiver: {
            address: userAddress,
          },
          status: FriendStatus.ACCEPTED,
        },
      ],
      select: {
        sender: {
          name: true,
          address: true,
        },
        receiver: {
          name: true,
          address: true,
        },
      },
      relations: {
        receiver: true,
        sender: true,
      },
      skip:
        pageOptionsDto.skip ?? (pageOptionsDto.page - 1) * pageOptionsDto.take,
      take: pageOptionsDto.take,
      order: {
        updatedAt: pageOptionsDto.order,
      },
    });

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });

    return new PageDto(entities, pageMetaDto);
  }
}
