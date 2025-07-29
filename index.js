const express = require('express')
const request = require('request')
const crypto = require('crypto')

const app = express()
app.use(express.json())

// 创建32位随机字符串
function generateRandom32String() {
  // 创建 16 字节（128位）的 Uint8Array，最终转换为 32 位十六进制字符串
  const array = new Uint8Array(16);
  crypto.getRandomValues(array); // 填充随机值

  // 将字节数组转换为十六进制字符串
  return Array.from(array, byte =>
      byte.toString(16).padStart(2, '0')
  ).join('');
}

const mchId = process.env.mch_id; // 商户号
const appId = process.env.app_id; // 小程序appID

app.post('/unifiedOrder', async function (req, res) {
  const ip = req.headers['x-forwarded-for'] // 小程序直接callcontainer请求会存在
  const openid = req.headers['x-wx-openid'] // 小程序直接callcontainer请求会存在
  // 如果是业务异步流程需自己替换openid来源
  const { text, fee } = req.body
  console.log("Pre-pay Req:", req.body)
  const totalPrice = parseInt(fee)

  const payreq = {
    body: text, // 订单描述
    out_trade_no: generateOrderId(), // 自定义订单号
    sub_mch_id: mchId, // 微信支付商户号
    total_fee: totalPrice, // 金额，单位：分
    openid: openid, // 用户唯一身份ID
    spbill_create_ip: ip, // 用户客户端IP地址
    env_id: req.headers['x-wx-env'], // 接收回调的环境ID
    callback_type: 2, // 云托管服务接收回调，填2
    container: {
      service: req.headers['x-wx-service'], // 回调的服务名称
      path: '/' // 回调的路径
    }
  }

  const payinfo = {
    appid : appId, // 小程序id
    mchid : mchId,
    description : text,
    out_trade_no : generateOrderId(), // 商户系统内部订单号
    attach : "自定义数据说明",
    notify_url : "https://www.weixin.qq.com/wxpay/pay.php", // 商户接收支付成功回调通知的地址
    "goods_tag" : "WXG", // 订单优惠标记
    amount : {
      total : totalPrice,
      currency : "CNY"
    },
    payer : {
      openid : openid
    },
    "detail" : {
      "cost_price" : 608800,
      "invoice_id" : "微信123",
      "goods_detail" : [
        {
          "merchant_goods_id" : "1246464644",
          "wechatpay_goods_id" : "1001",
          "goods_name" : "iPhoneX 256G",
          "quantity" : 1,
          "unit_price" : 528800
        }
      ]
    }
  }

  console.log('[unifiedOrder]请求体', payreq)
  const info = await callpay('unifiedorder', payinfo)
  console.log('[unifiedOrder]响应体', info)
  res.send(info)
})

app.listen(80, function () {
  console.log('服务启动成功！')
})

function callpay (action, paybody) {
  const method = 'POST' // HTTP对应的方法

  const timestamp = `${Date.now()}` // 当前时间戳
  const randomStr = generateRandom32String(); // 随机32位字符串

  // 将paybody转换成一行
  const body = JSON.stringify(paybody)

  return new Promise((resolve, reject) => {
    request({
      url: "http://api.weixin.qq.com/_/pay/unifiedOrder",
      method: method,
      headers: {
        'Accpet': 'application/json',
        'Content-Type': 'application/json'
      },
      body: body
    }, function (error, res) {
      if (error) {
        resolve(error)
      } else {
        resolve(res.body)
      }
    })
  })
}

function generateOrderId() {
  const year = new Date().getFullYear().toString()
  const month = new Date().getMonth().toString()
  const date = new Date().getDate().toString()
  const hour = new Date().getHours().toString()
  const minute = new Date().getMinutes().toString()

  const timeSeq = year + date + month + minute + hour
  const randomSeq = Math.random().toString(36).slice(-8)

  return timeSeq + randomSeq
}