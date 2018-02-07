# Coinbase Takehome

## Description
Create a web service that provides quotes for digital currency trades using data from the GDAX orderbook.

## Instructions to Run

In the command line:
1. Run `git clone https://github.com/KSpaeth1866/coinbase-takehome.git`
1. Run `npm install`
1. Run `npm start`
    1. This will start the server on http://localhost:3000/ unless you change `process.env.port` from 3000


Then submit a POST request to http://localhost:3000/quote with the request fields as described by the Service Specification
1. With Postman:
    1. Set the Header `key: value` to `Content-Type: application/json`
    1. The body should be raw JSON
1. With command line/curl:
    1. `curl -X POST http://localhost:3000/quote --data '{“action”: “buy”, “base_currency”: “BTC”, “quote_currency”: “USD”, “amount”: “1.00000000”}' -H 'Content-Type: application/json'` replacing with whichever values you choose to test

## Service Specification
The web service has only one endpoint that receives JSON requests and responds with JSON. If there are any errors processing the request, it responds with a JSON object including an error message.

1. Route
    1. POST `/quote`
1. Request Fields
    1. `action` (String): Either “buy” or “sell”
    1. `base_currency` (String): The currency to be bought or sold
    1. `quote_currency` (String): The currency to quote the price in
    1. `amount` (String): The amount of the base currency to be traded
1. Response fields
    1. `price` (String): The per-unit cost of the base currency
    1. `total` (String): Total quantity of quote currency
    1. `currency` (String): The quote currency

The service should be able to quote trades between any two currencies that GDAX has an orderbook for. It should also be able to support trades where the base and quote currencies are the inverse of a GDAX trading pair. For example, the service should be able to quote a buy of BTC (base currency) using ETH (quote currency), even though the GDAX orderbook is ETH-BTC.

The service uses the GET `https://api-public.sandbox.gdax.com/products/<product-id>/book endpoint`.

## Notes

### Buying/Selling on the Orderbook

Suppose we are passed a request to either buy or sell with BTC and USD as either the base and quote. Then we need to acquire the BTC-USD orderbook (see Notes - Orderbook matching). This orderbook is listed as bids (offers to buy BTC using USD) or asks (offers to sell BTC in return for USD).

We have 4 cases:
1. Buy BTC using USD
1. Sell BTC using USD
1. Buy USD using BTC
1. Sell USD using BTC.

In the first case, when we want to buy BTC using USD, we use the asks (offers to sell BTC for USD) on the BTC-USD orderbook. Similarly, the when we want to sell BTC for USD, we use the bids (offers to buy BTC for USD). In the third case, when we want to buy USD for BTC, we use the bids (offers to buy BTC for USD). Then in the fourth, selling USD for BTC will use the asks (offers to sell BTC for USD). Summarized:
1. Buy BTC -> asks
1. Sell BTC -> bids
1. Buy USD -> bids
1. Sell USD -> asks

In the general case, the base/quote pair can have a base-quote orderbook or a quote-base orderbook. This will result in the following mapping:
1. base-quote orderbook, buying base -> asks
1. base-quote orderbook, selling base -> bids
1. quote-base orderbook, buying base -> bids
1. quote-base orderbook, selling base -> asks

### Orderbook Matching

As noted in the specs, we should be able to quote a buy of BTC (base currency) using ETH (quote currency), even though the GDAX orderbook is ETH-BTC. A GET request at `https://api-public.sandbox.gdax.com/products` shows that the valid currency product ids are:
1. `BTC-USD`
1. `BTC-GBP`
1. `BTC-EUR`
1. `ETH-BTC`
1. `ETH-USD`
1. `LTC-BTC`
1. `LTC-USD`
1. `ETH-EUR`

One method of dealing with this could be passing the base_currency and quote_currency into a helper function that would output the correct product id, if one exists. Another could be trying to send two GET requests to `https://api-public.sandbox.gdax.com/products/<product-id>/book?level=2`, using `base-quote` and `quote-base` as `<product-id>`, and returning the successful response if available.

For example, if we are passed USD as base and BTC as quote, the first solution would parse the base and quote into `BTC-USD` as the product id, which is faster as it only has a single GET request to the GDAX server. However, the first solution is less scalable without maintenance as if time a product id changed (i.e. `BTC-USD` => `USD-BTC`) or a new one is added (i.e. `ETH-GBP`) this function would need to be updated, otherwise the service would not respond correctly. The second, however, would still get the correct/new orderbook, although it would be slower as it might require two requests. A combination that parses through the set product matching then tries both combinations if that fails would benefit from the speed of knowing the product ids while being more robust in the long term.

For the purposes of this exercise I chose to simply parse the inputs per the product-ids above to keep it more simple.

### Walking Through the Orderbook

The orderbook has a list of bids (offers to buy) and asks (offers to sell), which are arrays of arrays of the form `[[price, size, num-orders], ...]`, ordered by best price. From the API documentation:

> The size field is the sum of the size of the orders at that price, and num-orders is the count of orders at that price; size should not be multiplied by num-orders.

For example, an ask order of `[8500, 0.5347346, 1]` in the BTC-USD orderbook means there is a price bucket of $8,500 USD and there are 0.5347346 BTC available for purchase at that price. If orderbook had `[8500, 0.5347346, 1], [8550, 0.4652654, 1]` and we wanted to buy 1 BTC, we would need to spend (8,500 USD/BTC * 0.5347346 BTC) + (8550 USD/BTC * 0.4652654 BTC) = $8,523.26 USD for that 1 BTC. In general, as we walk through, we check if the current order is sufficient to fill our quote. If it is, take all we need. If not, take it all, add it to the amount of base acquired so far in the walk, and add the price of that order to the current value accumulated so far. For example see below:

Request:

{
	"action": "buy",

	"base_currency": "BTC",

	"quote_currency": "USD",

	"amount": "2"

}

Asks:

[

  [ '7194', '1.70675943', 2 ],

  [ '7194.55', '0.01', 1 ],

  [ '7195.5', '0.06', 1 ],

  [ '7201.44', '0.65669501', 1 ],

  [ '7205.46', '0.1', 1 ],

  ...

]

1. Round 0
    1. Amount Accumulated: `0`
    1. Price So Far: `0`
1. Round 1
    1. Amount Needed => `2 - 0 = 2`
    1. `1.70675943 < 2`, so take it all
    1. Amount Accumulated => `0 + 1.70675943 = 1.70675943`
    1. Price So Far => `0 + 7194 * 1.70675943 = 12,278.42733942`
1. Round 2
    1. Amount Needed => `2 - 1.70675943 = 0.29324057`
    1. `0.01 < 0.29324057`, so take it all
    1. Amount Accumulated => `1.70675943 + 0.01 = 1.71675943`
    1. Price So Far => `12,278.42733942 + 7194.55 * 0.01 = 12,350.37283942`
1. Round 3
    1. Amount Needed => `2 - 1.71675943 = 0.28324057`
    1. `0.06 < 0.28324057`, so take it all
    1. Amount Accumulated => `1.71675943 + 0.06 = 1.77675943`
    1. Price So Far => `12,350.37283942 + 7195.5 * 0.06 = 12,782.10283942`
1. Round 4
    1. Amount Needed => `2 - 1.77675943 = 0.22324057`
    1. `0.65669501 > 0.22324057`, so take <b>only what we need</b>
    1. Amount Accumulated => `1.77675943 + 0.22324057 = 2`
    1. Price So Far => `12,782.10283942 + 7201.44 * 0.22324057 = 14,389.7564098408`
1. Round 5
    1. Amount Needed => `2 - 2 = 0`, done

So we have accumulated our 2 BTC for a price of 14,389.7564098408 USD. We then respond:

{

  "total": "14,389.76",

  "price": 14,389.7564098408/2 = "7,194.88",

  "currency": "USD"

}

If we traverse the entire orderbook without getting to the the requested amount, respond with an error - "Not enough currency in orderbook to complete quote".

When base/currency pair is the reverse of the orderbook (i.e. base USD, quote BTC executing against the BTC-USD orderbook) we need to change how we interpret the bids and asks. If we have `[8000, 0.55, 1]` in the BTC-USD orderbook, that means there are 0.55 BTC available at a price of 8,000 USD/BTC. This then translates to (8,000 USD/BTC * 0.55 BTC) = $4,400 USD at a price of 1/(8000 USD/BTC) = 0.000125 BTC/USD, for an equivalent order of `[ 0.000125, 4,400, 1 ]`. As such, when walking through the orderbook, if the base/quote is the reverse of the orderbook listing all we need to do is the above conversion.
