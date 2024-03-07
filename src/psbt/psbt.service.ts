import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { type Network } from 'bitcoinjs-lib';
import * as Bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import { ConfigService } from '@nestjs/config';
import { testnet, bitcoin } from 'bitcoinjs-lib/src/networks';

import * as btc from '@scure/btc-signer';

import { WalletTypes } from '@src/user/user.entity';

Bitcoin.initEccLib(ecc);

export const SIGNATURE_SIZE = 126;

export interface IInscriptionWithUtxo extends IUtxo, IInscription {}

export interface IInscription {
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

interface BatchInscriptionInfo {
  [index: string]: Partial<IInscription>;
}

@Injectable()
export class PsbtService {
  private feePercent: number;
  private adminAddress: string;
  private network: Network;
  private readonly logger: Logger;
  private unisatApiKey: string;
  private bisApiKey: string;

  constructor(private configService: ConfigService) {
    this.logger = new Logger(PsbtService.name);

    this.feePercent = this.configService.get('psbtConfig.feePercent');
    this.adminAddress = this.configService.get('psbtConfig.adminAddress');
    const networkType = this.configService.get('psbtConfig.network');
    this.unisatApiKey = this.configService.get('psbtConfig.unisatApiKey');
    this.bisApiKey = this.configService.get('psbtConfig.bisApiKey');

    if (networkType === 'mainnet') this.network = bitcoin;
    else this.network = testnet;
  }

  async generateSwapPsbt({
    walletType,
    sellerInscriptionIds,
    buyerInscriptionIds,
    price,
    paymentPubkey,
    pubkey,
  }: {
    walletType: WalletTypes;
    sellerInscriptionIds: string[];
    buyerInscriptionIds: string[];
    price: number;
    paymentPubkey?: string;
    pubkey: string;
  }): Promise<{
    psbt: string;
    buyerAddress: string;
    sellerAddress: string;
    buyerTaprootsignIndexes: number[];
    buyerPaymentsignIndexes: number[];
  }> {
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

    // if (buyerAddress === sellerAddress)
    //   throw new BadRequestException(
    //     'Cant create a swap using the same inscription',
    //   );

    const buyerScriptpubkey = Buffer.from(
      buyerInscriptionsWithUtxo[0].scriptpubkey,
      'hex',
    );

    const sellerScriptpubkey = Buffer.from(
      sellerInscriptionsWithUtxo[0].scriptpubkey,
      'hex',
    );

    const psbt = new Bitcoin.Psbt({ network: this.network });

    const buyerTaprootsignIndexes: number[] = [];

    buyerInscriptionsWithUtxo.forEach((inscriptionUtxo) => {
      buyerTaprootsignIndexes.push(psbt.inputCount);

      psbt.addInput({
        hash: inscriptionUtxo.txid,
        index: inscriptionUtxo.vout,
        witnessUtxo: {
          value: inscriptionUtxo.value,
          script: buyerScriptpubkey,
        },
        tapInternalKey:
          walletType === WalletTypes.XVERSE || walletType === WalletTypes.OKX
            ? Buffer.from(pubkey, 'hex')
            : Buffer.from(pubkey, 'hex').slice(1, 33),
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

    let paymentAddress, paymentOutput;

    if (walletType === WalletTypes.XVERSE) {
      const hexedPaymentPubkey = Buffer.from(paymentPubkey, 'hex');
      const p2wpkh = Bitcoin.payments.p2wpkh({
        pubkey: hexedPaymentPubkey,
        network: this.network,
      });

      const { address, redeem } = Bitcoin.payments.p2sh({
        redeem: p2wpkh,
        network: this.network,
      });

      paymentAddress = address;
      paymentOutput = redeem?.output;
    } else if (
      walletType === WalletTypes.UNISAT ||
      walletType === WalletTypes.OKX
    ) {
      paymentAddress = buyerAddress;
    }

    const btcUtxos = await this.getBtcUtxoByAddress(paymentAddress);
    const feeRate = await this.getFeeRate(this.network);

    let amount = 0;

    const buyerPaymentsignIndexes: number[] = [];

    for (const utxo of btcUtxos) {
      const fee = this.calculateTxFee(psbt, feeRate);

      if (amount < price + fee && utxo.value > 10000) {
        amount += utxo.value;

        buyerPaymentsignIndexes.push(psbt.inputCount);

        if (
          walletType === WalletTypes.UNISAT ||
          walletType === WalletTypes.OKX
        ) {
          psbt.addInput({
            hash: utxo.txid,
            index: utxo.vout,
            witnessUtxo: {
              value: utxo.value,
              script: buyerScriptpubkey,
            },
            tapInternalKey:
              walletType === WalletTypes.OKX
                ? Buffer.from(pubkey, 'hex')
                : Buffer.from(pubkey, 'hex').slice(1, 33),
            sighashType: Bitcoin.Transaction.SIGHASH_ALL,
          });
        } else if (walletType === WalletTypes.XVERSE) {
          const txHex = await this.getTxHexById(utxo.txid);

          psbt.addInput({
            hash: utxo.txid,
            index: utxo.vout,
            redeemScript: paymentOutput,
            nonWitnessUtxo: Buffer.from(txHex, 'hex'),
            sighashType: Bitcoin.Transaction.SIGHASH_ALL,
          });
        }
      }
    }

    const fee = this.calculateTxFee(psbt, feeRate);

    if (amount < price + fee)
      throw new BadRequestException(
        "You don't have enough bitcoin in your wallet.",
      );

    if (price > 0)
      psbt.addOutput({
        address: sellerAddress,
        value: price,
      });

    psbt.addOutput({
      address: paymentAddress,
      value: amount - price - fee,
    });

    return {
      psbt: psbt.toHex(),
      buyerAddress,
      sellerAddress,
      buyerPaymentsignIndexes,
      buyerTaprootsignIndexes,
    };
  }

  calculateTxFee(psbt: Bitcoin.Psbt, feeRate: number): number {
    const tx = new Bitcoin.Transaction();

    for (let i = 0; i < psbt.txInputs.length; i++) {
      const txInput = psbt.txInputs[i];

      tx.addInput(txInput.hash, txInput.index, txInput.sequence);
      tx.setWitness(i, [Buffer.alloc(SIGNATURE_SIZE)]);
    }

    for (let txOutput of psbt.txOutputs) {
      tx.addOutput(txOutput.script, txOutput.value);
    }
    tx.addOutput(psbt.txOutputs[0].script, psbt.txOutputs[0].value);
    tx.addOutput(psbt.txOutputs[0].script, psbt.txOutputs[0].value);

    return tx.virtualSize() * feeRate;
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
          : `https://open-api.unisat.io/v1/indexer/inscription/info/${inscriptionId}`;

      const config = {
        headers: {
          Authorization: `Bearer ${this.unisatApiKey}`,
        },
      };

      const res = await axios.get(url, config);

      if (res.data.code === -1)
        throw new BadRequestException('Invalid inscription id');

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
        `Ordinal api is not working now, please try again later Or invalid inscription id ${inscriptionId}`,
      );
      throw new BadRequestException(
        `Ordinal api is not working now, please try again later Or invalid inscription id ${inscriptionId}`,
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
        : `https://open-api.unisat.io/v1/indexer/address/${address}/utxo-data`;

    const config = {
      headers: {
        Authorization: `Bearer ${this.unisatApiKey}`,
      },
    };

    let cursor = 0;
    const size = 5000;
    const utxos: IUtxo[] = [];

    while (1) {
      const res = await axios.get(url, { ...config, params: { cursor, size } });

      if (res.data.code === -1) throw new BadRequestException('Invalid addres');

      utxos.push(
        ...(res.data.data.utxo as any[]).map((utxo) => {
          return {
            scriptpubkey: utxo.scriptPk,
            txid: utxo.txid,
            value: utxo.satoshi,
            vout: utxo.vout,
          };
        }),
      );

      cursor += res.data.data.utxo.length;

      if (cursor === res.data.data.total) break;
    }

    return utxos;
  }

  async getInscriptionUtxoByAddress(address: string): Promise<IInscription[]> {
    try {
      const url =
        this.network === testnet
          ? `https://open-api-testnet.unisat.io/v1/indexer/address/${address}/inscription-utxo-data`
          : `https://open-api.unisat.io/v1/indexer/address/${address}/inscription-utxo-data`;

      const config = {
        headers: {
          Authorization: `Bearer ${this.unisatApiKey}`,
        },
      };

      let cursor = 0;
      const size = 5000;
      const inscriptionUtxos: IInscription[] = [];

      while (1) {
        const res = await axios.get(url, {
          ...config,
          params: {
            cursor,
            size,
          },
        });

        if (res.data.code === -1)
          throw new BadRequestException('Invalid addres');

        inscriptionUtxos.push(
          ...res.data.data.utxo.map((inscription) => {
            return {
              address: inscription.address,
              inscriptionId: inscription.inscriptions[0].inscriptionId,
              inscriptionNumber: inscription.inscriptions[0].inscriptionNumber,
              contentType: '',
            };
          }),
        );

        cursor += res.data.data.utxo.length;

        if (cursor === res.data.data.total) break;
      }

      return inscriptionUtxos;
    } catch (error) {
      throw new BadRequestException(
        'Ordinal api is not working now or Invalid address',
      );
    }
  }

  async getInscriptionByAddress(address: string): Promise<IInscription[]> {
    try {
      const url =
        this.network === testnet
          ? `https://open-api-testnet.unisat.io/v1/indexer/address/${address}/inscription-data`
          : `https://open-api.unisat.io/v1/indexer/address/${address}/inscription-data`;

      const config = {
        headers: {
          Authorization: `Bearer ${this.unisatApiKey}`,
        },
      };

      let cursor = 0;
      const size = 5000;
      const inscriptionUtxos: IInscription[] = [];

      while (1) {
        const res = await axios.get(url, {
          ...config,
          params: {
            cursor,
            size,
          },
        });

        if (res.data.code === -1)
          throw new BadRequestException('Invalid address');

        inscriptionUtxos.push(
          ...res.data.data.inscription.map((inscription) => {
            return {
              address: inscription.address,
              inscriptionId: inscription.inscriptionId,
              inscriptionNumber: inscription.inscriptionNumber,
              contentType: inscription.contentType,
            };
          }),
        );

        cursor += res.data.data.inscription.length;

        if (cursor === res.data.data.total) break;
      }

      return inscriptionUtxos;
    } catch (error) {
      throw new BadRequestException(
        'Ordinal api is not working now or Invalid address',
      );
    }
  }

  async getBatchInscriptionInfoBIS(
    inscriptions: string[],
  ): Promise<BatchInscriptionInfo> {
    try {
      if (inscriptions.length === 0) return {};

      const url =
        this.network === testnet
          ? `https://testnet.api.bestinslot.xyz/v3/inscription/batch_info`
          : `https://api.bestinslot.xyz/v3/inscription/batch_info`;

      const res = await axios.post(
        url,
        {
          queries: inscriptions,
        },
        {
          headers: {
            'x-api-key': this.bisApiKey,
          },
        },
      );

      const batchInscriptionInfo: BatchInscriptionInfo = {};

      res.data.data.forEach((inscriptionInfo: any) => {
        batchInscriptionInfo[inscriptionInfo.query as string] = {
          contentType: inscriptionInfo.result.mime_type,
          address: inscriptionInfo.result.wallet,
          inscriptionId: inscriptionInfo.result.inscription_id,
          inscriptionNumber: inscriptionInfo.result.inscription_number,
        };
      });

      return batchInscriptionInfo;
    } catch (error) {
      throw new BadRequestException(
        'Ordinal api is not working now or Invalid address',
      );
    }
  }

  async getTxHexById(txId: string): Promise<string> {
    try {
      const { data } = await axios.get(
        `https://mempool.space/${
          this.network === testnet ? 'testnet/' : ''
        }api/tx/${txId}/hex`,
      );

      return data as string;
    } catch (error) {
      this.logger.error('Mempool api error. Can not get transaction hex');

      throw new BadRequestException(
        'Mempool api is not working now. Try again later',
      );
    }
  }

  addTapInternalKey(
    hexedPsbt: string,
    indexes: number[],
    pubkey: string,
    walletType: WalletTypes,
  ): string {
    const psbt = Bitcoin.Psbt.fromHex(hexedPsbt);
    indexes.forEach((index) => {
      psbt.updateInput(index, {
        tapInternalKey:
          walletType === WalletTypes.XVERSE || walletType === WalletTypes.OKX
            ? Buffer.from(pubkey, 'hex')
            : Buffer.from(pubkey, 'hex').slice(1, 33),
      });
    });

    return psbt.toHex();
  }
}
