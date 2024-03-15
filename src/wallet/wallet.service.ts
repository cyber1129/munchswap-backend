import { Injectable } from '@nestjs/common';

import { WalletRepository } from './wallet.repository';
import { Wallet } from './wallet.entity';

@Injectable()
export class WalletService {
  constructor(private readonly walletRepository: WalletRepository) {}

  async findByAddress(address: string): Promise<Wallet> {
    return this.walletRepository.findOne({ where: { address } });
  }

  async createWalletWithAddress(address: string): Promise<Wallet> {
    const walletEntity = this.walletRepository.create({ address });

    const wallet = await this.walletRepository.save(walletEntity, {
      reload: false,
    });

    return this.walletRepository.findOne({ where: { uuid: wallet.uuid } });
  }

  async createWallet(body: Partial<Wallet>): Promise<Wallet> {
    const walletEntity = this.walletRepository.create(body);
    const savedWallet = await this.walletRepository.save(walletEntity, {
      reload: false,
    });

    return this.findByUuid(savedWallet.uuid);
  }

  async findByUuid(uuid: string): Promise<Wallet> {
    return this.walletRepository.findOne({ where: { uuid } });
  }

  async updateWallet(body: Partial<Wallet>, walletId: number): Promise<Wallet> {
    await this.walletRepository.update({ id: walletId }, body);

    return this.findByAddress(body.address);
  }
}
