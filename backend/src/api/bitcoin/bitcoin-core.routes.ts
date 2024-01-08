import { Application, NextFunction, Request, Response } from 'express';
import logger from '../../logger';
import bitcoinClient from './bitcoin-client';

/**
 * Define a set of routes used by the accelerator server
 * Those routes are not designed to be public
 */
class BitcoinBackendRoutes {
  private static tag = 'BitcoinBackendRoutes';

  public initRoutes(app: Application) {
    app
      .get('/api/internal/bitcoinCore/' + 'getMempoolEntry', this.disableCache, this.$getMempoolEntry)
      .post('/api/internal/bitcoinCore/' + 'decodeRawTransaction', this.disableCache, this.$decodeRawTransaction)
      .get('/api/internal/bitcoinCore/' + 'getRawTransaction', this.disableCache, this.$getRawTransaction)
      .post('/api/internal/bitcoinCore/' + 'sendRawTransaction', this.disableCache, this.$sendRawTransaction)
      .post('/api/internal/bitcoinCore/' + 'testMempoolAccept', this.disableCache, this.$testMempoolAccept)
      .get('/api/internal/bitcoinCore/' + 'getMempoolAncestors', this.disableCache, this.$getMempoolAncestors)
      .get('/api/internal/bitcoinCore/' + 'getBlock', this.disableCache, this.$getBlock)
      .get('/api/internal/bitcoinCore/' + 'getBlockHash', this.disableCache, this.$getBlockHash)
      .get('/api/internal/bitcoinCore/' + 'getBlockCount', this.disableCache, this.$getBlockCount)
    ;
  }

  /**
   * Disable caching for bitcoin core routes
   * 
   * @param req 
   * @param res 
   * @param next 
   */
  private disableCache(req: Request, res: Response, next: NextFunction): void  {
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Cache-control', 'private, no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('expires', -1);
    next();
  }

  /**
   * Exeption handler to return proper details to the accelerator server
   * 
   * @param e 
   * @param fnName 
   * @param res 
   */
  private static handleException(e: any, fnName: string, res: Response): void {
    if (typeof(e.code) === 'number') {
      res.status(400).send(JSON.stringify(e, ['code', 'message']));
    } else {     
      const err = `exception in ${fnName}. ${e}. Details: ${JSON.stringify(e, ['code', 'message'])}`; 
      logger.err(err, BitcoinBackendRoutes.tag);
      res.status(500).send(err);
    }
  }

  private async $getMempoolEntry(req: Request, res: Response): Promise<void> {
    const txid = req.query.txid;
    try {
      if (typeof(txid) !== 'string' || txid.length !== 64) {
        res.status(400).send(`invalid param txid ${txid}. must be a string of 64 char`);
        return;
      }
      const mempoolEntry = await bitcoinClient.getMempoolEntry(txid);
      if (!mempoolEntry) {
        res.status(404).send(`no mempool entry found for txid ${txid}`);
        return;
      }
      res.status(200).send(mempoolEntry);
    } catch (e: any) {
      BitcoinBackendRoutes.handleException(e, 'getMempoolEntry', res);
    }
  }

  private async $decodeRawTransaction(req: Request, res: Response): Promise<void> {
    const rawTx = req.body.rawTx;
    try {
      if (typeof(rawTx) !== 'string') {
        res.status(400).send(`invalid param rawTx ${rawTx}. must be a string`);
        return;
      }
      const decodedTx = await bitcoinClient.decodeRawTransaction(rawTx);
      if (!decodedTx) {
        res.status(400).send(`unable to decode rawTx ${rawTx}`);
        return;
      }
      res.status(200).send(decodedTx);
    } catch (e: any) {
      BitcoinBackendRoutes.handleException(e, 'decodeRawTransaction', res);
    }
  }

  private async $getRawTransaction(req: Request, res: Response): Promise<void> {
    const txid = req.query.txid;
    try {
      if (typeof(txid) !== 'string' || txid.length !== 64) {
        res.status(400).send(`invalid param txid ${txid}. must be a string of 64 char`);
        return;
      }
      const decodedTx = await bitcoinClient.getRawTransaction(txid);
      if (!decodedTx) {
        res.status(400).send(`unable to get raw transaction for txid ${txid}`);
        return;
      }
      res.status(200).send(decodedTx);
    } catch (e: any) {
      BitcoinBackendRoutes.handleException(e, 'decodeRawTransaction', res);
    }
  }

  private async $sendRawTransaction(req: Request, res: Response): Promise<void> {
    const rawTx = req.body.rawTx;
    try {
      if (typeof(rawTx) !== 'string') {
        res.status(400).send(`invalid param rawTx ${rawTx}. must be a string`);
        return;
      }
      const txHex = await bitcoinClient.sendRawTransaction(rawTx);
      if (!txHex) {
        res.status(400).send(`unable to send rawTx ${rawTx}`);
        return;
      }
      res.status(200).send(txHex);
    } catch (e: any) {
      BitcoinBackendRoutes.handleException(e, 'sendRawTransaction', res);
    }
  }

  private async $testMempoolAccept(req: Request, res: Response): Promise<void> {
    const rawTx = req.body.rawTx;
    try {
      if (typeof(rawTx) !== 'string') {
        res.status(400).send(`invalid param rawTx ${rawTx}. must be a string`);
        return;
      }
      const txHex = await bitcoinClient.testMempoolAccept([rawTx]);
      if (typeof(txHex) !== 'object' || txHex.length === 0) {
        res.status(400).send(`testmempoolaccept failed for raw tx ${rawTx}, got an empty result`);
        return;
      }
      res.status(200).send(txHex);
    } catch (e: any) {
      BitcoinBackendRoutes.handleException(e, 'testMempoolAccept', res);
    }
  }

  private async $getMempoolAncestors(req: Request, res: Response): Promise<void> {
    const txid = req.query.txid;
    try {
      if (typeof(txid) !== 'string' || txid.length !== 64) {
        res.status(400).send(`invalid param txid ${txid}. must be a string of 64 char`);
        return;
      }
      const decodedTx = await bitcoinClient.getMempoolAncestors(txid);
      if (!decodedTx) {
        res.status(400).send(`unable to get mempool ancestors for txid ${txid}`);
        return;
      }
      res.status(200).send(decodedTx);
    } catch (e: any) {
      BitcoinBackendRoutes.handleException(e, 'getMempoolAncestors', res);
    }
  }

  private async $getBlock(req: Request, res: Response): Promise<void> {
    const blockHash = req.query.hash;
    try {
      if (typeof(blockHash) !== 'string' || blockHash.length !== 64) {
        res.status(400).send(`invalid param blockHash ${blockHash}. must be a string of 64 char`);
        return;
      }
      const block = await bitcoinClient.getBlock(blockHash);
      if (!block) {
        res.status(400).send(`unable to get block for block hash ${blockHash}`);
        return;
      }
      res.status(200).send(block);
    } catch (e: any) {
      BitcoinBackendRoutes.handleException(e, 'getBlock', res);
    }
  }

  private async $getBlockHash(req: Request, res: Response): Promise<void> {
    const blockHeight = req.query.height;
    try {
      if (typeof(blockHeight) !== 'string') {
        res.status(400).send(`invalid param blockHeight ${blockHeight}, must be a string representing an integer`);
        return;
      }
      const blockHeightNumber = parseInt(blockHeight, 10);
      if (!blockHeightNumber) {
        res.status(400).send(`invalid param blockHeight ${blockHeight}. must be a valid integer`);
        return;
      }

      const block = await bitcoinClient.getBlockHash(blockHeightNumber);
      if (!block) {
        res.status(400).send(`unable to get block hash for block height ${blockHeightNumber}`);
        return;
      }
      res.status(200).send(block);
    } catch (e: any) {
      BitcoinBackendRoutes.handleException(e, 'getBlockHash', res);
    }
  }

  private async $getBlockCount(req: Request, res: Response): Promise<void> {
    try {
      const count = await bitcoinClient.getBlockCount();
      if (!count) {
        res.status(400).send(`unable to get block count`);
        return;
      }
      res.status(200).send(`${count}`);
    } catch (e: any) {
      BitcoinBackendRoutes.handleException(e, 'getBlockCount', res);
    }
  }
}

export default new BitcoinBackendRoutes