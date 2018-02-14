/******************

Helper funtions used to keep the code clean

getProductId:
  Takes base and quote currency and responds with the product-id used by
  the GDAX API
  see Notes - Orderbook Matching in the ReadMe

getBidsOrAsks:
  Takes the base currency, action (buy/sell), productId, and orderbook and
  returns with the bids or asks from the orderbook based on which should be
  used to calculate the quote
  see Notes - Buying/Selling on the Orderbook in the ReadMe

walkThroughOrderbook:
  Walks through the orderbook and returns the total amount of base currency
  accumulated and the amount of equivalent quote currency per the orderbook
  see Notes - Walking Through the Orderbook in the ReadMe

parsePriceAndAmount:
  Takes the priceSoFar and amountAccumulated from walking through the orderbook
  and rounds it to 2 decimal places if in USD, EUR, or GBP, or 8 if in on of
  the cryptocurrencies. Then turns it into a string per the service specs.

******************/


/*
see Notes - Orderbook Matching in the ReadMe
*/
getProductId = (base, quote) => {
  if (
    (base === "BTC" && quote === "USD") ||
    (base === "USD" && quote === "BTC")
  ) return "BTC-USD";
  if (
    (base === "BTC" && quote === "GBP") ||
    (base === "GBP" && quote === "BTC")
  ) return "BTC-GBP";
  if (
    (base === "BTC" && quote === "EUR") ||
    (base === "EUR" && quote === "BTC")
  ) return "BTC-EUR";
  if (
    (base === "ETH" && quote === "BTC") ||
    (base === "BTC" && quote === "ETH")
  ) return "ETH-BTC";
  if (
    (base === "ETH" && quote === "USD") ||
    (base === "USD" && quote === "ETH")
  ) return "ETH-USD";
  if (
    (base === "LTC" && quote === "BTC") ||
    (base === "BTC" && quote === "LTC")
  ) return "LTC-BTC";
  if (
    (base === "LTC" && quote === "USD") ||
    (base === "USD" && quote === "LTC")
  ) return "LTC-USD";
  if (
    (base === "ETH" && quote === "EUR") ||
    (base === "EUR" && quote === "ETH")
  ) return "ETH-EUR";
  return null;
}

/*
see Notes - Buying/Selling on the Orderbook in the ReadMe
*/
getBidsOrAsks = (base, action, productId, book) => {
  if (
    (action === 'buy' && productId.slice(0, 3) === base) ||
    (action === 'sell' && productId.slice(4) === base)
  ) return book.asks;
  else if (
    (action === 'sell' && productId.slice(0, 3) === base) ||
    (action === 'buy' && productId.slice(4) === base)
  ) return book.bids;
  return null;
}

/*
see Notes - Walking Through the Orderbook
*/
walkThroughOrderbook = (orders, totalAmountNeeded, productId, base) => {
  let index = 0;
  let amountAccumulated = 0;
  let priceSoFar = 0;

  while (amountAccumulated < totalAmountNeeded && index < orders.length) {

    let orderPrice = productId.slice(0, 3) === base
      ? parseFloat(orders[index][0])
      : 1/parseFloat(orders[index][0]);

    let orderAmount = productId.slice(0, 3) === base
      ? parseFloat(orders[index][1])
      : parseFloat(orders[index][0]) * parseFloat(orders[index][1]);

    let remainingAmountNeeded = totalAmountNeeded - amountAccumulated;

    if (remainingAmountNeeded > orderAmount) {
      priceSoFar += orderPrice*orderAmount
      amountAccumulated += orderAmount
    }
    else {
      priceSoFar += orderPrice*remainingAmountNeeded
      amountAccumulated += remainingAmountNeeded
    }

    index++;
  }

  return {
    priceSoFar,
    amountAccumulated,
  }
}

parsePriceAndAmount = (priceSoFar, amountAccumulated, quote) => {
  let totalValue = priceSoFar;
  let pricePer = priceSoFar/amountAccumulated;
  if (quote === "USD" || quote === "GBP" || quote == "EUR") {
    totalValue = totalValue.toFixed(2);
    pricePer = pricePer.toFixed(2);
  }
  else {
    totalValue = totalValue.toFixed(8);
    pricePer = pricePer.toFixed(8);
  }
  return {
    total: totalValue.toString(),
    price: pricePer.toString(),
  }
}

module.exports = {
  getProductId,
  getBidsOrAsks,
  walkThroughOrderbook,
  parsePriceAndAmount,
}
