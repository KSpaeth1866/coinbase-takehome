/******************

Express server, using bodyparser to read req.body.base_currency, etc

******************/

// router setup
const express = require('express');
const app = express();

// body-parser to read arguments
const bodyParser = require('body-parser');
app.use(bodyParser.json());

// catch input/bodyparser error
app.use((error, req, res, next) => {
  if (error) {
    res.status(400).send({
      success: false,
      message: error.message,
    })
  }
})

// quote service routes
const routes = require('./routes')
app.use('/', routes);

// read port or set to 3000, launch server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(
    `
    \n\n****************************************\n\n
    \tApp running on port ${port}
    \n\n****************************************\n\n
    `
  )
})
