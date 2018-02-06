/******************

Routes used by the app -

POST /quote:
  Main route used to quote purchases/sales of one currency to another

USE /quote:
  Disallow other methods (GET, PUT, etc.) on the /quote route

USE (error):
  Catch any other uncaught errors and communicate them in the repsonse

******************/

// router setup
const express = require('express');
const router = express.Router();

const axios = require('axios');

const {
  getProductId,
  getBidsOrAsks,
  walkThroughOrderbook,
} = require('./helperFunctions');

router.post('/quote', async (req, res) => {

  let base = req.body.base_currency.toUpperCase();
  let quote = req.body.quote_currency.toUpperCase();
  let action = req.body.action.toLowerCase();
  let totalAmountNeeded = parseFloat(req.body.amount);

  let productId = getProductId(base, quote);
  let book;

  try {
    let response = await axios.get(`https://api-public.sandbox.gdax.com/products/${productId}/book?level=2`)
    book = response.data;
  }
  catch (e) {
    res.status(e.response.status).send({
      success: false,
      message: e.response.data.message,
      error: e.message,
    });
    return;
  }

  let orders = getBidsOrAsks(base, action, productId, book)

  if (orders.length === 0) {
    res.status(404).send({
      success: false,
      message: "Cannot complete quote, empty orderbook"
    })
    return;
  }

  let {
    priceSoFar,
    amountAccumulated,
  } = walkThroughOrderbook(orders, totalAmountNeeded, productId, base);

  if (amountAccumulated < totalAmountNeeded) {
    res.status(400).send({
      success: false,
      message: "Not enough currency in orderbook to complete quote",
    })
  }
  else {
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
