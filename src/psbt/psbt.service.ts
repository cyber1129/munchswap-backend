import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { type Network } from 'bitcoinjs-lib';
import * as Bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import { ConfigService } from '@nestjs/config';
import { testnet, bitcoin } from 'bitcoinjs-lib/src/networks';

import { WalletTypes } from '@src/user/user.entity';

Bitcoin.initEccLib(ecc);

export interface IInscription {
  address: string;
  inscriptionId: string;
  inscriptionNumber: number;
  output: string;
  outputValue: number;
  contentType: string;
}

interface IUtxo {
  txid: string;
  vout: number;
  value: number;
}

@Injectable()
export class PsbtService {
  private feePercent: number;
  private adminAddress: string;
  private network: Network;
  private readonly logger: Logger;

  constructor(private configService: ConfigService) {
    this.logger = new Logger(PsbtService.name);

    this.feePercent = this.configService.get('psbtConfig.feePercent');
    this.adminAddress = this.configService.get('psbtConfig.adminAddress');
    const networkType = this.configService.get('psbtConfig.network');

    if (networkType === 'mainnet') this.network = bitcoin;
    else this.network = testnet;
  }

  async generateBuyNowPsbt({
    ownerPubkey,
    buyerPubkey,
    walletType,
    recipient,
    network,
    inscriptionId,
    price,
    ownerWalletType,
    ownerPaymentAddress,
  }: {
    ownerPubkey: string;
    buyerPubkey: string;
    walletType: WalletTypes;
    recipient: string;
    network: Network;
    inscriptionId: string;
    price: number;
    ownerWalletType: WalletTypes;
    ownerPaymentAddress: string;
  }): Promise<{ psbt: string; inputCount: number }> {
    const buyerHexedPubkey = Buffer.from(buyerPubkey, 'hex');
    let buyerAddress, buyerOutput;

    if (walletType === WalletTypes.HIRO) {
      const { address, output } = Bitcoin.payments.p2wpkh({
        pubkey: buyerHexedPubkey,
        network: network,
      });

      buyerAddress = address;
      buyerOutput = output;
    } else if (walletType === WalletTypes.UNISAT) {
      const { address, output } = Bitcoin.payments.p2tr({
        internalPubkey: buyerHexedPubkey.slice(1, 33),
        network: network,
      });

      buyerAddress = address;
      buyerOutput = output;
    } else if (walletType === WalletTypes.XVERSE) {
      const p2wpkh = Bitcoin.payments.p2wpkh({
        pubkey: buyerHexedPubkey,
        network: network,
      });

      const { address, redeem } = Bitcoin.payments.p2sh({
        redeem: p2wpkh,
        network: network,
      });

      buyerAddress = address;
      buyerOutput = redeem?.output;
    }

    const ownerHexedPubkey = Buffer.from(ownerPubkey, 'hex');

    const { address: ownerAddress, output: ownerOutput } =
      Bitcoin.payments.p2tr({
        internalPubkey:
          ownerWalletType === WalletTypes.XVERSE
            ? ownerHexedPubkey
            : ownerHexedPubkey.slice(1, 33),
        network: network,
      });

    const psbt = new Bitcoin.Psbt({ network: network });
    const inscriptions = await this.getInscriptions(ownerAddress, network);

    const inscription = inscriptions.find(
      (inscription) => inscription.inscriptionId === inscriptionId,
    );

    if (!inscription)
      throw new BadRequestException(
        'Can not find inscription id in owner address',
      );

    const [inscriptionHash, inscriptionIndex] = inscription.output.split(
      ':',
    ) as [string, string];

    const utxos = await this.getTransferableUtxos(
      buyerAddress as string,
      network,
    );
    const feeRate = await this.getFeeRate(network);

    psbt.addInputs([
      {
        hash: inscriptionHash,
        index: Number(inscriptionIndex),
        witnessUtxo: {
          value: inscription.outputValue,
          script: ownerOutput,
        },
        tapInternalKey:
          ownerWalletType === WalletTypes.XVERSE
            ? ownerHexedPubkey
            : ownerHexedPubkey.slice(1, 33),
      },
    ]);

    let amount = 0;
    if (walletType === WalletTypes.HIRO) {
      for (const utxo of utxos) {
        if (amount < price + (psbt.inputCount + 4) * 60 * feeRate) {
          amount += utxo.value;
          psbt.addInput({
            hash: utxo.txid,
            index: utxo.vout,
            witnessUtxo: {
              value: utxo.value,
              script: buyerOutput as Buffer,
            },
          });
        }
      }
    } else if (walletType === WalletTypes.UNISAT) {
      for (const utxo of utxos) {
        if (amount < price + (psbt.inputCount + 4) * 60 * feeRate) {
          amount += utxo.value;
          psbt.addInput({
            hash: utxo.txid,
            index: utxo.vout,
            witnessUtxo: {
              value: utxo.value,
              script: buyerOutput as Buffer,
            },
            tapInternalKey: buyerHexedPubkey.slice(1, 33),
          });
        }
      }
    } else if (walletType === WalletTypes.XVERSE) {
      for (const utxo of utxos) {
        if (amount < price + (psbt.inputCount + 4) * 60 * feeRate) {
          amount += utxo.value;

          try {
            const { data } = await axios.get(
              `https://mempool.space/${
                network === testnet ? 'testnet/' : ''
              }api/tx/${utxo.txid}/hex`,
            );
            psbt.addInput({
              hash: utxo.txid,
              index: utxo.vout,
              redeemScript: buyerOutput,
              nonWitnessUtxo: Buffer.from(data, 'hex'),
            });
          } catch (error) {
            throw new BadRequestException(
              'Ordinal api is not working now. Try again later',
            );
          }
        }
      }
    }

    if (amount < price + (psbt.inputCount + 4) * 60 * feeRate)
      throw new BadRequestException(
        "You don't have enough bitcoin in your wallet",
      );

    psbt.addOutputs([
      {
        value: inscription.outputValue,
        address: recipient,
      },
      {
        value: Math.floor((price * (100 - this.feePercent)) / 100),
        address: ownerPaymentAddress,
      },
      {
        value: amount - (price + (psbt.inputCount + 4) * 60 * feeRate),
        address: buyerAddress,
      },
    ]);

    if (Math.floor((price * this.feePercent) / 100) > 0)
      psbt.addOutput({
        value: Math.floor((price * this.feePercent) / 100),
        address: this.adminAddress,
      });

    return { psbt: psbt.toHex(), inputCount: psbt.inputCount };
  }

  async generateSwapPsbt({
    ownerPubkey,
    buyerPaymentPubkey,
    buyerTaprootPubkey,
    walletType,
    recipient,
    network,
    sellerInscriptionId,
    buyerInscriptionIds,
    price,
    ownerWalletType,
    buyerWalletType,
    ownerPaymentAddress,
  }: {
    ownerPubkey: string;
    buyerPaymentPubkey: string;
    buyerTaprootPubkey: string;
    walletType: WalletTypes;
    recipient: string;
    network: Network;
    sellerInscriptionId: string;
    buyerInscriptionIds: string[];
    price: number;
    ownerWalletType: WalletTypes;
    buyerWalletType: WalletTypes;
    ownerPaymentAddress: string;
  }): Promise<{ psbt: string; inputCount: number }> {
    const buyerPaymentHexedPubkey = Buffer.from(buyerPaymentPubkey, 'hex');

    const { output: buyerTaprootOutput } = Bitcoin.payments.p2tr({
      internalPubkey:
        buyerWalletType === WalletTypes.XVERSE
          ? Buffer.from(buyerTaprootPubkey, 'hex')
          : Buffer.from(buyerTaprootPubkey, 'hex').slice(1, 33),
      network: network,
    });

    let buyerPaymentAddress, buyerPaymentOutput;

    if (walletType === WalletTypes.HIRO) {
      const { address, output } = Bitcoin.payments.p2wpkh({
        pubkey: buyerPaymentHexedPubkey,
        network: network,
      });

      buyerPaymentAddress = address;
      buyerPaymentOutput = output;
    } else if (walletType === WalletTypes.UNISAT) {
      const { address, output } = Bitcoin.payments.p2tr({
        internalPubkey: buyerPaymentHexedPubkey.slice(1, 33),
        network: network,
      });

      buyerPaymentAddress = address;
      buyerPaymentOutput = output;
    } else if (walletType === WalletTypes.XVERSE) {
      const p2wpkh = Bitcoin.payments.p2wpkh({
        pubkey: buyerPaymentHexedPubkey,
        network: network,
      });

      const { address, redeem } = Bitcoin.payments.p2sh({
        redeem: p2wpkh,
        network: network,
      });

      buyerPaymentAddress = address;
      buyerPaymentOutput = redeem?.output;
    }

    const ownerHexedPubkey = Buffer.from(ownerPubkey, 'hex');

    const { address: ownerAddress, output: ownerOutput } =
      Bitcoin.payments.p2tr({
        internalPubkey:
          ownerWalletType === WalletTypes.XVERSE
            ? ownerHexedPubkey
            : ownerHexedPubkey.slice(1, 33),
        network: network,
      });

    const psbt = new Bitcoin.Psbt({ network: network });

    const sellerInscriptions = await this.getInscriptions(
      ownerAddress,
      network,
    );

    const sellerInscription = sellerInscriptions.find(
      (inscription) => inscription.inscriptionId === sellerInscriptionId,
    );

    if (!sellerInscription)
      throw new BadRequestException(
        'Can not find inscription id in owner address',
      );

    const [sellerInscriptionHash, sellerInscriptionIndex] =
      sellerInscription.output.split(':') as [string, string];

    const buyerInscriptions = await this.getInscriptions(recipient, network);
    const buyerInscription: IInscription[] = [];

    buyerInscriptionIds.forEach((buyerInscriptionId) => {
      const inscription = buyerInscriptions.find(
        (inscription) => inscription.inscriptionId === buyerInscriptionId,
      );
      if (inscription) buyerInscription.push(inscription);
    });

    if (buyerInscription.length !== buyerInscriptionIds.length)
      throw new BadRequestException(
        'Can not find inscription id in buyer address',
      );

    const utxos = await this.getTransferableUtxos(
      buyerPaymentAddress as string,
      network,
    );

    const feeRate = await this.getFeeRate(network);
    const buyerTaprootHexedPubkey = Buffer.from(buyerTaprootPubkey, 'hex');

    psbt.addInputs([
      {
        hash: sellerInscriptionHash,
        index: Number(sellerInscriptionIndex),
        witnessUtxo: {
          value: sellerInscription.outputValue,
          script: ownerOutput,
        },
        tapInternalKey:
          ownerWalletType === WalletTypes.XVERSE
            ? ownerHexedPubkey
            : ownerHexedPubkey.slice(1, 33),
      },
    ]);

    buyerInscription.forEach((inscription) => {
      const [buyerInscriptionHash, buyerInscriptionIndex] =
        inscription.output.split(':') as [string, string];

      psbt.addInput({
        hash: buyerInscriptionHash,
        index: Number(buyerInscriptionIndex),
        witnessUtxo: {
          value: inscription.outputValue,
          script: buyerTaprootOutput,
        },
        tapInternalKey:
          buyerWalletType === WalletTypes.XVERSE
            ? buyerTaprootHexedPubkey
            : buyerTaprootHexedPubkey.slice(1, 33),
      });
    });

    let amount = 0;
    if (walletType === WalletTypes.HIRO) {
      for (const utxo of utxos) {
        if (amount < price + (psbt.inputCount + 5) * 60 * feeRate) {
          amount += utxo.value;
          psbt.addInput({
            hash: utxo.txid,
            index: utxo.vout,
            witnessUtxo: {
              value: utxo.value,
              script: buyerPaymentOutput as Buffer,
            },
          });
        }
      }
    } else if (walletType === WalletTypes.UNISAT) {
      for (const utxo of utxos) {
        if (amount < price + (psbt.inputCount + 5) * 60 * feeRate) {
          amount += utxo.value;
          psbt.addInput({
            hash: utxo.txid,
            index: utxo.vout,
            witnessUtxo: {
              value: utxo.value,
              script: buyerPaymentOutput as Buffer,
            },
            tapInternalKey: buyerPaymentHexedPubkey.slice(1, 33),
          });
        }
      }
    } else if (walletType === WalletTypes.XVERSE) {
      for (const utxo of utxos) {
        if (amount < price + (psbt.inputCount + 5) * 60 * feeRate) {
          amount += utxo.value;
          try {
            const { data } = await axios.get(
              `https://mempool.space/${
                network === testnet ? 'testnet/' : ''
              }api/tx/${utxo.txid}/hex`,
            );
            psbt.addInput({
              hash: utxo.txid,
              index: utxo.vout,
              redeemScript: buyerPaymentOutput,
              nonWitnessUtxo: Buffer.from(data, 'hex'),
            });
          } catch (error) {
            throw new BadRequestException(
              'Ordinal api is not working now. Try again later',
            );
          }
        }
      }
    }

    if (amount < price + (psbt.inputCount + 5) * 60 * feeRate)
      throw new BadRequestException(
        "You don't have enough bitcoin in your wallet",
      );

    psbt.addOutput({
      value: sellerInscription.outputValue,
      address: recipient,
    });

    buyerInscription.forEach((inscription) => {
      psbt.addOutput({
        value: inscription.outputValue,
        address: ownerAddress,
      });
    });

    if (Math.floor((price * (100 - this.feePercent)) / 100))
      psbt.addOutput({
        value: Math.floor((price * (100 - this.feePercent)) / 100),
        address: ownerPaymentAddress,
      });
    psbt.addOutput({
      value: amount - (price + (psbt.inputCount + 5) * 60 * feeRate),
      address: buyerPaymentAddress,
    });

    if (Math.floor((price * this.feePercent) / 100) > 0)
      psbt.addOutput({
        value: Math.floor((price * this.feePercent) / 100),
        address: this.adminAddress,
      });

    return { psbt: psbt.toHex(), inputCount: psbt.inputCount };
  }

  async getInscriptions(
    address: string,
    network: Network,
  ): Promise<IInscription[]> {
    try {
      const inscriptions: IInscription[] = [];

      const headers: HeadersInit =
        network === testnet
          ? { 'X-Client': 'UniSat Wallet' }
          : { Accept: 'application/json' };

      let cursor = 0;
      const pageSize = 20;

      let done = false;

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
              outputValue: Number(inscriptionData.value),
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
      throw new BadRequestException(
        'Ordinal api is not working now. Try again later',
      );
    }
  }

  async getTransferableUtxos(
    address: string,
    network: Network,
  ): Promise<IUtxo[]> {
    const transferableUtxos: IUtxo[] = [];

    const utxos = await this.getUtxos(address, network);
    const inscriptions = await this.getInscriptions(address, network);

    utxos.forEach((utxo) => {
      const inscriptionUtxo = inscriptions.find((inscription) => {
        return inscription.output.includes(`${utxo.txid}:${utxo.vout}`);
      });
      if (!inscriptionUtxo) transferableUtxos.push(utxo);
    });

    return transferableUtxos;
  }

  async getUtxos(address: string, network: Network): Promise<IUtxo[]> {
    try {
      const url = `https://mempool.space/${
        network === testnet ? 'testnet/' : ''
      }api/address/${address}/utxo`;
      const res = await axios.get(url);
      const utxos: IUtxo[] = [];
      res.data.forEach((utxoData: any) => {
        utxos.push({
          txid: utxoData.txid,
          vout: utxoData.vout,
          value: utxoData.value,
        });
      });

      return utxos;
    } catch (error) {
      throw new BadRequestException(
        'Ordinal api is not working now. Try again later',
      );
    }
  }

  async getFeeRate(network: Network): Promise<number> {
    try {
      const url = `https://mempool.space/${
        network === testnet ? 'testnet/' : ''
      }api/v1/fees/recommended`;

      const res = await axios.get(url);

      return res.data.halfHourFee;
    } catch (error) {
      throw new BadRequestException(
        'Ordinal api is not working now. Try again later',
      );
    }
  }

  convertHexedToBase64(hexedPsbt: string): string {
    const psbt = Bitcoin.Psbt.fromHex(hexedPsbt);
    return psbt.toBase64();
  }

  convertBase64ToHexed(base64Psbt: string): string {
    const psbt = Bitcoin.Psbt.fromBase64(base64Psbt);
    return psbt.toHex();
  }

  async pushRawTx(rawTx: string, network: Network): Promise<string> {
    this.logger.log('rawTx', rawTx);
    const txid = await this.postData(
      `https://mempool.space/${network === testnet ? 'testnet/' : ''}api/tx`,
      rawTx,
    );
    this.logger.log('pushed txid', txid);
    return txid;
  }

  async postData(
    url: string,
    json: any,
    content_type = 'text/plain',
    apikey = '',
  ): Promise<string | undefined> {
    while (1) {
      try {
        const headers: any = {};

        if (content_type) headers['Content-Type'] = content_type;

        if (apikey) headers['X-Api-Key'] = apikey;
        const res = await axios.post(url, json, {
          headers,
        });

        return res.data as string;
      } catch (err) {
        const axiosErr = err as AxiosError;
        this.logger.error('push tx error', axiosErr.response?.data);

        if (
          !(axiosErr.response?.data as string).includes(
            'sendrawtransaction RPC error: {"code":-26,"message":"too-long-mempool-chain,',
          )
        )
          throw new Error('Got an err when push tx');
      }
    }
  }

  async combinePsbt(
    hexedPsbt: string,
    signedHexedPsbt1: string,
    signedHexedPsbt2: string,
  ): Promise<string> {
    const psbt = Bitcoin.Psbt.fromHex(hexedPsbt);
    const signedPsbt1 = Bitcoin.Psbt.fromHex(signedHexedPsbt1);
    const signedPsbt2 = Bitcoin.Psbt.fromHex(signedHexedPsbt2);

    psbt.combine(signedPsbt1, signedPsbt2);

    return psbt.toHex();
  }

  async combinePsbtAndPush(
    hexedPsbt: string,
    signedHexedPsbt1: string,
    signedHexedPsbt2: string,
  ): Promise<string> {
    const psbt = Bitcoin.Psbt.fromHex(hexedPsbt);
    const signedPsbt1 = Bitcoin.Psbt.fromHex(signedHexedPsbt1);
    const signedPsbt2 = Bitcoin.Psbt.fromHex(signedHexedPsbt2);

    psbt.combine(signedPsbt1, signedPsbt2);
    const tx = psbt.extractTransaction();
    const txHex = tx.toHex();

    const txId = await this.pushRawTx(txHex, this.network);
    return txId;
  }

  finalizePsbtInput(hexedPsbt: string, inputs: number[]): string {
    const psbt = Bitcoin.Psbt.fromHex(hexedPsbt);
    inputs.forEach((input) => psbt.finalizeInput(input));
    return psbt.toHex();
  }

  getInputCount(hexedPsbt: string): number {
    const psbt = Bitcoin.Psbt.fromHex(hexedPsbt);
    return psbt.inputCount;
  }
}
