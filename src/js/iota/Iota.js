import IOTA from 'iota.lib.js';
import createDayNumber from '../helperFunctions/createDayNumber';
import powaas from './powaas';

// todo: random node selection needs to replace by
// something detecting the health of iota nodes
const NODES = ['https://pow3.iota.community:443',
  'https://nodes.thetangle.org:443'];

export default class Iota {
  constructor() {
    this.node = NODES[Math.floor(Math.random() * NODES.length)];
    this.iotaNode = new IOTA({ provider: this.node });
    this.tagLength = 27;
    this.depth = 3;
    this.minWeight = 14;
  }

  createTimeTag(number) {
    return `DWEB${this.iotaNode.utils.toTrytes(number.toString())}`;
  }

  send(tryteAddress, tryteMessage, tag = 'DWEBPAGETESTE') {
    const transfers = [
      {
        value: 0,
        address: tryteAddress,
        message: tryteMessage,
        tag,
      },
    ];
    return new Promise((resolve, reject) => {
      this.iotaNode.api.sendTransfer(tryteAddress, this.depth, this.minWeight, transfers, (err, res) => {
        if (!err) {
          return resolve(res);
        }
        return reject(err);
      });
    });
  }

  /**
   * Creates entry on tangle: unencrypted files need metadata,
   * encrypted files are found by file hash
   * @param {object} metadata
   */
  sendMetadata(metadata) {
    if (!this.node.includes('thetangle.org')) {
      powaas(this.iotaNode, 'https://api.powsrv.io:443/');
    }
    const iotaJson = metadata;
    const tag = this.createTimeTag(createDayNumber());
    const tryteAddress = metadata.publicTryteKey.slice(0, 81);
    iotaJson.publicTryteKey = metadata.publicTryteKey.slice(81);
    const tryteMessage = this.iotaNode.utils.toTrytes(JSON.stringify(iotaJson));
    this.send(tryteAddress, tryteMessage, tag); // add tag
  }

  sendLog(logEntry) {
    const tryteAddress = this.iotaNode.utils.toTrytes(logEntry.fileId).slice(0, 81);
    const tryteMessage = this.iotaNode.utils.toTrytes(JSON.stringify(logEntry));
    this.send(tryteAddress, tryteMessage);
  }

  /**
   * Generates 86 character long tryte public key for secp256r1
   * @param {string} hexKey
   */
  hexKeyToTryte(hexKey) {
    const trytePublicKey = this.iotaNode.utils.toTrytes(Buffer.from(hexKey, 'hex').toString('base64'));
    // starts always with KB => remove KB
    return trytePublicKey.substr(2);
  }

  /**
   * Transforms a tryte public key to a hex public key for secp256r1
   * @param {string} tryteKey
   */
  tryteKeyToHex(tryteKey) {
    return Buffer.from(this.iotaNode.utils.fromTrytes(`KB${tryteKey}`), 'base64').toString('hex');
  }

  getTransaction(searchVarsAddress) {
    return new Promise((resolve, reject) => {
      this.iotaNode.api.findTransactions(searchVarsAddress, (error, transactions) => {
        if (error) {
          reject(error);
        } else {
          resolve(transactions);
        }
      });
    });
  }

  /**
   * Gets transactions on IOTA by name
   * @param {string} filename
   */
  getTransactionByTag(tag) {
    const searchVarsAddress = {
      tags: [tag], // 'BILDPNG99999999999999999999'
    };
    return this.getTransaction(searchVarsAddress);
  }

  /**
  *
  * @param {string} hash
  */
  getTransactionByHash(hash) {
    const loggingAddress = this.iotaNode.utils.toTrytes(hash).substring(0, 81);
    const searchVarsAddress = {
      addresses: [loggingAddress],
    };
    return this.getTransaction(searchVarsAddress);
  }

  /**
 * Get transaction by address
 * @param {string} tryte Address
 * @param {string} tag
 */
  getTransactionByAddressAndTag(address, tag) {
    const searchVarsAddress = {
      addresses: [address],
      tags: [tag],
    };
    return this.getTransaction(searchVarsAddress);
  }

  /**
   * Returns the message of an Iota transaction
   * @param {string} transaction
   */
  getMessage(transaction) {
    return new Promise((resolve, reject) => {
      this.iotaNode.api.getBundle(transaction, (error, sucess2) => {
        if (error) {
          reject(error);
        } else {
          const message = sucess2[0].signatureMessageFragment;
          const [usedMessage] = message.split(
            '999999999999999999999999999999999999999999',
          );
          const obj = JSON.parse(this.iotaNode.utils.fromTrytes(usedMessage));
          obj.tag = sucess2[0].tag;
          obj.address = sucess2[0].address;
          resolve(obj);
        }
      });
    });
  }

  /**
   *
   * @param {string} transaction
   */
  getAddress(transaction) {
    return new Promise((resolve, reject) => {
      this.iotaNode.api.getBundle(transaction, (error, sucess2) => {
        if (error) {
          reject(error);
        } else {
          const message = sucess2[0].signatureMessageFragment;
          const [usedMessage] = message.split(
            '99999999999999999999999999999999999999999999999999',
          );
          const obj = JSON.parse(this.iotaNode.utils.fromTrytes(usedMessage));
          resolve(obj);
        }
      });
    });
  }
}