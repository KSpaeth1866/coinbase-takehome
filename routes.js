/******************

Routes used by the app -

POST /quote:
  Main route used to quote purchases/sales of one currency to another

USE /quote:
  Disallow other methods (GET, PUT, etc.) on the /quote route

USE (error):
  Catch any other uncaught errors and communicate them in the repsonse

******************/

// router and helper function setup
const express = require('express');
const router = express.Router();
const Gdax = require('gdax');
const publicClient = new Gdax.PublicClient();
const {
  getProductId,
  getBidsOrAsks,
  walkThroughOrderbook,
} = require('./helperFunctions');

router.post('/quote', async (req, res) => {
  try {
    // parse fields from json request
    let base = req.body.base_currency.toUpperCase();
    let quote = req.body.quote_currency.toUpperCase();
    let action = req.body.action.toLowerCase();
    let totalAmountNeeded = parseFloat(req.body.amount);

    // amount needs to be a valid number
    if (
      typeof(parseFloat(req.body.amount)) != "number" ||
      isNaN(parseFloat(req.body.amount).toString()) ||
      totalAmountNeeded <= 0
    ) {
      throw new Error("Invalid amount input")
    }

    // if action isn't buy or sell send back error
    if (action !== 'buy' && action !== 'sell') {
      throw new Error("Invalid action input");
    }

    // see notation in helperFunctions or Notes - Orderbook Matching in the ReadMe
    let productId = getProductId(base, quote);
    if (!productId) {
      throw new Error("Invalid base/quote currency input");
    }

    // get orderbook from GDAX
    let book = await publicClient.getProductOrderBook(productId, {level: 2});
    if (!book) {
      throw new Error("No orderbook found");
    }

    // see getBidsOrAsks in helperFunctions or Notes - Buying/Selling on the Orderbook in the ReadMe
    let orders = getBidsOrAsks(base, action, productId, book)
    if (orders.length === 0) {
      throw new Error("Cannot complete quote, empty orderbook");
    }

    // see walkThroughOrderbook in helperFunctions or Notes - Walking Through the Orderbook
    let {
      priceSoFar,
      amountAccumulated,
    } = walkThroughOrderbook(orders, totalAmountNeeded, productId, base);

    // if the orderbook can't complete the buy/sell, throw error
    if (amountAccumulated < totalAmountNeeded) {
      throw new Error("Not enough currency in orderbook to complete quote");
    }
    else {
      // see parsePriceAndAmount in helperFunctions
      let {
        total,
        price,
      } = parsePriceAndAmount(priceSoFar, amountAccumulated, quote);

      res.status(200).send({
        sucess: true,
        total,
        price,
        currency: quote,
      })
    }
  }
  catch (e) {
    res.status(400).send({
      success: false,
      error: e.message,
    });
    return;
  }
})

router.use('/quote', (req, res) => {
  res.status(405).send({
    sucess: false,
    message: `The method is not allowed for the requested URL.`,
  })
})

router.use((error, req, res, next) => {
  if (error) {
    res.status(500).send({
      success: false,
      message: error.message,
    })
  }
})

module.exports = router;
