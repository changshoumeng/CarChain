const qtum= require('qtumjs-lib')
const bip39= require( 'bip39')
const server=require( './server')
const config=require( './config')

const unit = 'QTUM'
let network = {}
switch (config.getNetwork())
{
  case 'testnet':
    network = qtum.networks.qtum_testnet
    break
  case 'mainnet':
    network = qtum.networks.qtum
    break
}

module.exports = class Wallet {
  constructor(keyPair, setInfo) {
    this.keyPair = keyPair
    this.info = {
      address: this.getAddress(),
      balance: 'loading',
      unconfirmedBalance: 'loading',
      qrc20: [],
    }
    this.txList = []
  }

  validateMnemonic(mnemonic, password) {
    let tempWallet = Wallet.restoreFromMnemonic(mnemonic, password)
    return this.keyPair.toWIF() == tempWallet.keyPair.toWIF()
  }

  getAddress() {
    return this.keyPair.getAddress()
  }

  getPrivKey() {
    return this.keyPair.toWIF()
  }

  init() {
    if (config.getMode() != 'offline') {
      this.setInfo()
      this.setQrc20()
      this.setTxList()
    }
  }

  setInfo() {
    server.currentNode().getInfo(this.getAddress(), info => {
      this.info.balance = info.balance + unit
      this.info.unconfirmedBalance = info.unconfirmedBalance + unit
    })
  }

  setQrc20() {
    server.currentNode().getQrc20(this.getAddress(), info => {
      this.info.qrc20 = info
    })
  }

  setTxList() {
    server.currentNode().getTxList(this.getAddress(), txList => {
      this.txList = txList
    })
  }

  generateCreateContractTx(code, gasLimit, gasPrice, fee, callback) {
    let from = this.getAddress()
    server.currentNode().getUtxList(from, list => {
      let tx = Wallet.generateCreateContractTx(this, code, gasLimit, gasPrice, fee, list)
      if (typeof callback == 'function') callback(tx)
    })
  }

  generateSendToContractTx(contractAddress, encodedData, gasLimit, gasPrice, fee, callback) {
    let from = this.getAddress()
    server.currentNode().getUtxList(from, list => {
      let tx = Wallet.generateSendToContractTx(this, contractAddress, encodedData, gasLimit, gasPrice, fee, list)
      if (typeof callback == 'function') callback(tx)
    })
  }

  generateTx(to, amount, fee, callback) {
    let from = this.getAddress()
    server.currentNode().getUtxList(from, list => {
      let tx = Wallet.generateTx(this, to, amount, fee, list)
      if (typeof callback == 'function') callback(tx)
    })
  }

  sendRawTx(tx, callback) {
    Wallet.sendRawTx(tx, res => {
      this.init()
      if (typeof callback == 'function') callback(res)
    })
  }

  callContract(address, encodedData, callback) {
    Wallet.callContract(address, encodedData, callback)
  }

  static generateCreateContractTx(wallet, code, gasLimit, gasPrice, fee, utxoList) {
    return qtum.utils.buildCreateContractTransaction(wallet.keyPair, code, gasLimit, gasPrice, fee, utxoList)
  }

  static generateSendToContractTx(wallet, contractAddress, encodedData, gasLimit, gasPrice, fee, utxoList) {
    return qtum.utils.buildSendToContractTransaction(wallet.keyPair, contractAddress, encodedData, gasLimit, gasPrice, fee, utxoList)
  }

  static generateTx(wallet, to, amount, fee, utxoList) {
    return qtum.utils.buildPubKeyHashTransaction(wallet.keyPair, to, amount, fee, utxoList)
  }

  static sendRawTx(tx, callback) {
    server.currentNode().sendRawTx(tx, res => {
      if (typeof callback == 'function') callback(res)
    })
  }

  static callContract(address, encodedData, callback) {
    server.currentNode().callContract(address, encodedData, callback)
  }

  static validateBip39Mnemonic(mnemonic) {
    return bip39.validateMnemonic(mnemonic);
  }

  static restoreFromMnemonic(mnemonic, password) {
    //if (bip39.validateMnemonic(mnemonic) == false) return false
    let seedHex = bip39.mnemonicToSeedHex(mnemonic, password)
    console.log("restoreFromMnemonic ",seedHex,network)
    let hdNode = qtum.HDNode.fromSeedHex(seedHex, network)
    let account = hdNode.deriveHardened(88).deriveHardened(0).deriveHardened(0)
    let keyPair = account.keyPair
    return new Wallet(keyPair)
  }

  static restoreFromMobile(mnemonic) {
    let seedHex = bip39.mnemonicToSeedHex(mnemonic)
    let hdNode = qtum.HDNode.fromSeedHex(seedHex, network)
    let account = hdNode.deriveHardened(88).deriveHardened(0)
    let walletList = []
    for (let i = 0; i < 10; i++) {
      let wallet = account.deriveHardened(i)
      wallet = new Wallet(wallet.keyPair)
      wallet.setInfo()
      walletList[i] = {
        wallet: wallet,
        path: i
      }
    }
    return walletList
  }

  static restoreFromWif(wif) {
    let keyPair = qtum.ECPair.fromWIF(wif, network)
    return new Wallet(keyPair)
  }

  static generateMnemonic() {
    return bip39.generateMnemonic()
  }
}
