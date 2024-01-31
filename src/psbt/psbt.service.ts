import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { type Network } from 'bitcoinjs-lib';
import * as Bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import { ConfigService } from '@nestjs/config';
import { testnet, bitcoin } from 'bitcoinjs-lib/src/networks';

import { WalletTypes } from '@src/user/user.entity';

Bitcoin.initEccLib(ecc);

export interface IInscriptionWithUtxo extends IUtxo {
  address: string;
  inscriptionId: string;
  inscriptionNumber: number;
  contentType: string;
}

interface IUtxo {
  txid: string;
  vout: number;
  value: number;
  scriptpubkey?: string;
}

@Injectable()
export class PsbtService {
  private feePercent: number;
  private adminAddress: string;
  private network: Network;
  private readonly logger: Logger;
  private unisatApiKey: string;

  constructor(private configService: ConfigService) {
    this.logger = new Logger(PsbtService.name);

    this.feePercent = this.configService.get('psbtConfig.feePercent');
    this.adminAddress = this.configService.get('psbtConfig.adminAddress');
    const networkType = this.configService.get('psbtConfig.network');
    this.unisatApiKey = this.configService.get('psbtConfig.unisatApiKey');

    if (networkType === 'mainnet') this.network = bitcoin;
    else this.network = testnet;

    this.generateSwapPsbt({
      walletType: WalletTypes.UNISAT,
      network: this.network,
      sellerInscriptionIds: [
        '2a8c410566ec4799356a135a9b8add0d1faa58978a085e289805f97990555b8ei0',
        'e2aee5573501d08da9e55146ecc1f4707f59722ca3a3a0b3e21a5feba1e49957i0',
      ],
      buyerInscriptionIds: [
        '54d9ac1305fdc1c47fd833da990254157177d6ae9530e36ebd89496b7979533fi0',
      ],
      price: 0,
    });

    this.getBtcUtxoByAddress(
      'tb1pn952y2hrpzf9gfnmsg0zht2smhn2lrzxz569vtpt23aj8wqgndmsc4g58d',
    );
  }

  async generateSwapPsbt({
    walletType,
    network,
    sellerInscriptionIds,
    buyerInscriptionIds,
    price,
  }: {
    walletType: WalletTypes;
    network: Network;
    sellerInscriptionIds: string[];
    buyerInscriptionIds: string[];
    price: number;
  }): Promise<{psbt: string}> {
    const buyerInscriptionsWithUtxo = await Promise.all(
      buyerInscriptionIds.map((inscriptionId) =>
        this.getInscriptionWithUtxo(inscriptionId),
      ),
    );
    const sellerInscriptionsWithUtxo = await Promise.all(
      sellerInscriptionIds.map((inscriptionId) =>
        this.getInscriptionWithUtxo(inscriptionId),
      ),
    );

    const buyerAddress = buyerInscriptionsWithUtxo[0].address;
    const sellerAddress = sellerInscriptionsWithUtxo[0].address;

    const buyerScriptpubkey = Buffer.from(
      buyerInscriptionsWithUtxo[0].scriptpubkey,
      'hex',
    );
    const sellerScriptpubkey = Buffer.from(
      sellerInscriptionsWithUtxo[0].scriptpubkey,
      'hex',
    );

    const psbt = new Bitcoin.Psbt({ network: this.network });

    buyerInscriptionsWithUtxo.forEach((inscriptionUtxo) => {
      psbt.addInput({
        hash: inscriptionUtxo.txid,
        index: inscriptionUtxo.vout,
        witnessUtxo: {
          value: inscriptionUtxo.value,
          script: buyerScriptpubkey,
        },
        sighashType: Bitcoin.Transaction.SIGHASH_ALL,
      });

      psbt.addOutput({
        address: sellerAddress,
        value: inscriptionUtxo.value,
      });
    });

    sellerInscriptionsWithUtxo.forEach((inscriptionUtxo) => {
      psbt.addInput({
        hash: inscriptionUtxo.txid,
        index: inscriptionUtxo.vout,
        witnessUtxo: {
          value: inscriptionUtxo.value,
          script: sellerScriptpubkey,
        },
        sighashType: Bitcoin.Transaction.SIGHASH_ALL,
      });

      psbt.addOutput({
        address: buyerAddress,
        value: inscriptionUtxo.value,
      });
    });

    const btcUtxos = await this.getBtcUtxoByAddress(buyerAddress);
    const feeRate = await this.getFeeRate(network);

    let amount = 0;

    for (const utxo of btcUtxos) {
      if (amount < price + (psbt.inputCount + 5) * 60 * feeRate) {
        amount += utxo.value;
        psbt.addInput({
          hash: utxo.txid,
          index: utxo.vout,
          witnessUtxo: {
            value: utxo.value,
            script: buyerScriptpubkey,
          },
        });
      }
    }

    if (amount < price + (psbt.inputCount + 5) * 60 * feeRate)
      throw new BadRequestException(
        "You don't have enough bitcoin in your wallet.",
      );

    psbt.addOutput({
      address: buyerAddress,
      value: amount - (price + (psbt.inputCount + 5) * 60 * feeRate),
    });

    return {psbt: psbt.toHex()}
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

  async getInscriptionWithUtxo(
    inscriptionId: string,
  ): Promise<IInscriptionWithUtxo> {
    try {
      const url =
        this.network === testnet
          ? `https://open-api-testnet.unisat.io/v1/indexer/inscription/info/${inscriptionId}`
          : `https://open-api-s1.unisat.io/v1/indexer/inscription/info/${inscriptionId}`;

      const config = {
        headers: {
          Authorization: `Bearer ${this.unisatApiKey}`,
        },
      };

      const res = await axios.get(url, config);

      return {
        address: res.data.data.address,
        contentType: res.data.data.contentType,
        inscriptionId: inscriptionId,
        inscriptionNumber: res.data.data.inscriptionNumber,
        txid: res.data.data.utxo.txid,
        value: res.data.data.utxo.satoshi,
        vout: res.data.data.utxo.vout,
        scriptpubkey: res.data.data.utxo.scriptPk,
      };
    } catch (error) {
      this.logger.error(
        'Ordinal api is not working now, please try again later',
      );
      throw new BadRequestException(
        'Ordinal api is not working now, please try again later',
      );
    }
  }

  async getScriptpubkey(address: string, txid: string): Promise<string> {
    try {
      const url =
        this.network === testnet
          ? `https://mempool.space/testnet/api/tx/${txid}`
          : `https://mempool.space/api/tx/${txid}`;

      const res = await axios.get(url);

      const vout = res.data.vout as any[];
      const foundOut = vout.find((out) => out.scriptpubkey_address === address);

      return foundOut.scriptpubkey;
    } catch (error) {
      this.logger.error(
        'Mempool api is not working now, Please try again later',
      );
      throw new BadRequestException(
        'Mempool api is not working now, Please try again later',
      );
    }
  }

  async getBtcUtxoByAddress(address): Promise<IUtxo[]> {
    const url =
      this.network === testnet
        ? `https://open-api-testnet.unisat.io/v1/indexer/address/${address}/utxo-data`
        : `https://open-api-s1.unisat.io/v1/indexer/address/${address}/utxo-data`;

    const config = {
      headers: {
        Authorization: `Bearer ${this.unisatApiKey}`,
      },
    };

    const res = await axios.get(url, config);

    return (res.data.data.utxo as any[]).map((utxo) => {
      return {
        scriptpubkey: utxo.scriptPk,
        txid: utxo.txid,
        value: utxo.satoshi,
        vout: utxo.vout,
      };
    });
  }
}
