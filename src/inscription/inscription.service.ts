import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Network } from 'bitcoinjs-lib';
import { In } from 'typeorm';
import axios from 'axios';
import { bitcoin, testnet } from 'bitcoinjs-lib/src/networks';

import {
  PageDto,
  PageMetaDto,
  PageOptionsDto,
} from '@src/common/pagination/pagination.types';
import { ConfigService } from '@nestjs/config';
import { UserService } from '@src/user/user.service';
import { Inscription } from './inscription.entity';
import { InscriptionRepository } from './inscription.repository';

export interface IInscription {
  address: string;
  inscriptionId: string;
  inscriptionNumber: number;
  output: string;
  outputValue: number;
  contentType: string;
}

@Injectable()
export class InscriptionService {
  private network: Network;
  private logger: Logger;

  constructor(
    private inscriptionRepository: InscriptionRepository,
    private configService: ConfigService,
    private userService: UserService,
  ) {
    this.logger = new Logger();
    const networkType = this.configService.get('psbtConfig.network');

    if (networkType === 'mainnet') this.network = bitcoin;
    else this.network = testnet;
  }

  async findInscriptionById(inscriptionId: string): Promise<Inscription> {
    return this.inscriptionRepository.findOne({ where: { inscriptionId } });
  }

  async findInscriptionByIds(inscriptionIds: string[]): Promise<Inscription[]> {
    return this.inscriptionRepository.find({
      where: { inscriptionId: In(inscriptionIds) },
    });
  }

  async findInscriptionByIdsWithCollection(
    inscriptionIds: string[],
  ): Promise<Inscription[]> {
    return this.inscriptionRepository.find({
      where: { inscriptionId: In(inscriptionIds) },
      relations: { collection: true },
      select: {
        collection: {
          name: true,
          imgUrl: true,
          description: true,
        },
      },
    });
  }

  async findInscriptionAndSave(
    inscriptionIds: string[],
  ): Promise<Inscription[]> {
    return Promise.all(
      inscriptionIds.map(async (inscriptionId) => {
        const inscription = await this.inscriptionRepository.findOne({
          where: { inscriptionId },
        });

        if (inscription) return inscription;

        const inscriptoinEntity = await this.inscriptionRepository.create({
          inscriptionId,
          collectionId: 1,
        });

        const savedInscriptoin = await this.inscriptionRepository.save(
          inscriptoinEntity,
        );

        return savedInscriptoin;
      }),
    );
  }

  async getInscriptionInfo(inscriptionId: string) {
    const inscriptionInfo = await this.inscriptionRepository.findOne({
      select: {
        collection: {
          name: true,
          description: true,
          imgUrl: true,
        },
      },
      where: { inscriptionId },
      relations: {
        collection: true,
      },
    });

    const owner = await this.getInscriptionOwner(inscriptionId, this.network);
    const user = await this.userService.findByAddress(owner);

    if (user) {
      inscriptionInfo['user'] = {
        address: user.address,
      };
    }

    return inscriptionInfo;
  }

  async getOwnedInscriptions(address: string, pageOptionsDto: PageOptionsDto) {
    const inscriptions = await this.getInscriptions(address, this.network);
    const inscriptionIds = inscriptions.map(
      (inscription) => inscription.inscriptionId,
    );

    const inscriptionsInfo = await this.inscriptionRepository.find({
      select: {
        collection: {
          name: true,
          description: true,
          imgUrl: true,
        },
        updatedAt: false,
        deletedAt: false,
      },
      where: {
        inscriptionId: In(inscriptionIds),
      },
      relations: {
        collection: true,
      },
      skip:
        pageOptionsDto.skip ?? (pageOptionsDto.page - 1) * pageOptionsDto.take,
      take: pageOptionsDto.take,
    });

    if (inscriptionIds.length === 0)
      return new PageDto([], new PageMetaDto({ itemCount: 0, pageOptionsDto }));

    const itemCount = await this.inscriptionRepository
      .createQueryBuilder('inscription')
      .where(`inscription_id IN (:...ids)`, { ids: inscriptionIds })
      .getCount();

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });

    const entities = inscriptionsInfo.map((inscriptionInfo: any) => {
      const inscription = inscriptions.find(
        (inscription) =>
          inscription.inscriptionId === inscriptionInfo.inscriptionId,
      );

      inscriptionInfo.contentType = inscription.contentType;

      if (inscriptionInfo.buyNowActivity.length > 0) {
        if (inscriptionInfo.buyNowActivity[0].user.address !== address) {
          console.log(
            'inscriptionInfo.buyNowActivity[0].address',
            inscriptionInfo.buyNowActivity[0].address,
            address,
          );
          inscriptionInfo.buyNowActivity = [];
        }
      }

      delete inscriptionInfo.id;
      delete inscriptionInfo.uuid;
      delete inscriptionInfo.collectionId;
      delete inscriptionInfo.createdAt;
      delete inscriptionInfo.updatedAt;
      delete inscriptionInfo.deletedAt;

      return inscriptionInfo;
    });

    return new PageDto(entities, pageMetaDto);
  }

  async createInscription(collectionId: number, inscriptionId: string) {
    const inscription = await this.inscriptionRepository.findOne({
      where: { inscriptionId },
    });

    if (inscription)
      return this.inscriptionRepository.update(
        { inscriptionId },
        { collectionId },
      );

    const inscriptionEntity: Partial<Inscription> = {
      collectionId,
      inscriptionId,
    };

    this.inscriptionRepository.save(inscriptionEntity);
  }

  async checkInscriptionOwner(
    address: string,
    inscriptionId: string,
  ): Promise<boolean> {
    const ownerAddress = await this.getInscriptionOwner(
      inscriptionId,
      this.network,
    );

    return address === ownerAddress;
  }

  async getInscriptions(
    address: string,
    network: Network,
  ): Promise<IInscription[]> {
    const inscriptions: IInscription[] = [];

    const headers: HeadersInit =
      network === testnet
        ? { 'X-Client': 'UniSat Wallet' }
        : { Accept: 'application/json' };

    let cursor = 0;
    const pageSize = 20;

    let done = false;

    try {
      while (!done) {
        const url = `${
          network === testnet
            ? `https://unisat.io/testnet/wallet-api-v4/address/inscriptions?address=${address}&cursor=${cursor}&size=${pageSize}`
            : `https://api.hiro.so/ordinals/v1/inscriptions?address=${address}&offset=${cursor}&limit=${pageSize}`
        }`;

        const res = await axios.get(url, { headers });
        const inscriptionDatas = res.data;

        if (network === testnet) {
          inscriptionDatas.result.list.forEach((inscriptionData: any) => {
            inscriptions.push({
              address: inscriptionData.address,
              inscriptionId: inscriptionData.inscriptionId,
              inscriptionNumber: inscriptionData.inscriptionNumber,
              output: inscriptionData.output,
              outputValue: inscriptionData.outputValue,
              contentType: inscriptionData.contentType,
            });
          });
        } else {
          inscriptionDatas.results.forEach((inscriptionData: any) => {
            inscriptions.push({
              address: inscriptionData.address,
              inscriptionId: inscriptionData.id,
              inscriptionNumber: inscriptionData.number,
              output: inscriptionData.output,
              outputValue: inscriptionData.value,
              contentType: inscriptionData.content_type,
            });
          });
        }

        if (network === testnet) {
          if (inscriptionDatas.result.list.length < pageSize) {
            done = true;
          } else {
            cursor += pageSize;
          }
        } else {
          if (inscriptionDatas.results.length < pageSize) {
            done = true;
          } else {
            cursor += pageSize;
          }
        }
      }

      return inscriptions;
    } catch (error) {
      this.logger.error(error);

      throw new BadRequestException(
        'Ordinal api is not working now. Try again later',
      );
    }
  }

  async getPaginatedInscriptions(
    collectionId: number,
    pageOptionsDto: PageOptionsDto,
  ): Promise<PageDto<Inscription>> {
    const queryBuilder =
      this.inscriptionRepository.createQueryBuilder('inscription');

    queryBuilder
      .where(`inscription.collection_id=${collectionId}`)
      .orderBy('buy_now_activity.price', 'ASC')
      .skip(
        pageOptionsDto.skip ?? (pageOptionsDto.page - 1) * pageOptionsDto.take,
      )
      .take(pageOptionsDto.take);

    const itemCount = await queryBuilder.getCount();
    const { entities } = await queryBuilder.getRawAndEntities();

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });

    return new PageDto(entities, pageMetaDto);
  }

  async getInscriptionOwner(
    inscriptionId: string,
    network: Network,
  ): Promise<string> {
    try {
      if (network === testnet) {
        const url = `https://unisat.io/testnet/wallet-api-v4/inscription/utxo-detail`;

        const headers = {
          'X-Client': 'UniSat Wallet',
        };

        const result = await axios.get(url, {
          headers,
          params: {
            inscriptionId,
          },
        });

        return result.data.result.inscriptions[0].address;
      } else {
        const url = 'https://api.hiro.so/ordinals/v1/inscriptions';

        const result = await axios.get(url, {
          params: {
            id: inscriptionId,
          },
        });

        return result.data.results[0].address;
      }
    } catch (error) {
      this.logger.error(error);

      throw new BadRequestException(
        'Ordinal api is not working now. Try again later',
      );
    }
  }

  async search(keyWord: string): Promise<Inscription | null> {
    const inscription = await this.inscriptionRepository.findOne({
      where: {
        inscriptionId: keyWord,
      },
      relations: {
        collection: true,
      },
      select: {
        collection: {
          name: true,
          imgUrl: true,
        },
      },
      order: {
        updatedAt: 'DESC',
      },
    });

    if (!inscription) return;

    delete inscription.id;
    delete inscription.uuid;
    delete inscription.createdAt;
    delete inscription.updatedAt;
    delete inscription.deletedAt;
    delete inscription.collectionId;

    return inscription;
  }
}
