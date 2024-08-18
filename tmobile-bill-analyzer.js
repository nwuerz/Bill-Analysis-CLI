const readline = require('readline');
const { init } = require('./helpers.js');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

init(rl);