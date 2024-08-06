const fs = require('fs');
const { text } = require('./billText.js');
const { mapBillTextToJson, displayMenu, updateJsonData, handleFileReadError } = require('./helpers.js');

mapBillTextToJson(text);

fs.readFile('data.json', 'utf8', (err, data) => {
  if (err) handleFileReadError(err);

  const jsonData = JSON.parse(data);

  updateJsonData(jsonData);
  displayMenu(jsonData);
});