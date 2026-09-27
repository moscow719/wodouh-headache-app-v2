require('dotenv').config();

const serverless = require('serverless-http');
const app = require('../index');

module.exports = app;
module.exports.handler = serverless(app);