const fs = require('fs');
const readline = require('readline');
const { mapBillTextToJson, updateJsonData, handleFileReadError, getMultilineInput, displayMenu } = require('./helpers.js');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

init(rl);

async function init(rl) {
  const billText = await getMultilineInput(rl, 'Enter the text for the bill (end input with an empty line):');
  mapBillTextToJson(billText)

  fs.readFile('data.json', 'utf8', (err, data) => {
    if (err) handleFileReadError(err);
    const jsonData = JSON.parse(data);
    var updatedJsonData = updateJsonData(jsonData);
    displayMenu(rl, updatedJsonData);
  })
}