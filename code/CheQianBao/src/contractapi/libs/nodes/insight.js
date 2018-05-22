var axios=require('axios')
var config=require('../config')

let domain = ''
switch(config.getNetwork()) {
    case 'regtest':
        domain = 'http://10.10.28.14:3001'
        break
    case 'testnet':
        domain = 'https://testnet.qtum.org'
        domain = 'http://10.10.28.14:3001'
        break
    case 'mainnet':
        domain = 'https://explorer.qtum.org'
        domain = 'http://10.10.28.14:3001'
        break
}
const apiPrefix = domain + '/insight-api'
const webPrefix = domain

let _getRequest = function(url, callback) {
  axios.get(apiPrefix + url)
    .then(function (response) {
      if (typeof callback == 'function')
        callback(response.data)
    })
  .catch(function (error) {
    console.log(error)
  })
}

let _postRequest = function(url, data, callback) {
  axios.post(apiPrefix + url, data)
    .then(function (response) {
      if (typeof callback == 'function')
        callback(response.data)
    })
  .catch(function (error) {
    console.log(error)
  })
}

module.exports =  {
  getInfo(address, callback) {
    _getRequest('/addr/'+address, callback)
  },

  getTx(tx,callback) {
      _getRequest('/tx/' + tx, callback)
  },

  getQrc20(address, callback) {
    _getRequest('/erc20/balances?balanceAddress='+address, callback)
  },

  getTxList(address, callback) {
    _getRequest('/txs/?address='+address, callback)
  },

  getUtxList(address, callback) {
    _getRequest('/addr/'+address+'/utxo', function(response) {
      if (typeof callback == 'function')
        callback(response.map(item=>{
          return {
            address: item.address,
            txid: item.txid,
            confirmations: item.confirmations,
            isStake: item.isStake,
            amount: item.amount,
            value: item.satoshis,
            hash: item.txid,
            pos: item.vout
          }
        }))
    })
  },

  sendRawTx(rawTx, callback) {
    _postRequest('/tx/send', {
      rawtx: rawTx
    }, function(response) {
      if (typeof callback == 'function')
        callback(response.txid)
    })
  },

  getTxExplorerUrl(tx) {
    return domain + '/tx/' + tx
  },

  getAddrExplorerUrl(addr) {
    return domain + '/address/' + addr
  },

  callContract(address, encodedData, callback) {
    _getRequest('/contracts/'+address+'/hash/'+encodedData+'/call', function(response) {
      if (typeof callback == 'function')
        callback(response["executionResult"]["output"])
    })
  }
}
