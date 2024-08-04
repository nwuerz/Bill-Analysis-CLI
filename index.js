const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Read the JSON data from the file
fs.readFile('data.json', 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading file:', err);
    return;
  }

  const jsonData = JSON.parse(data);
  updateVoiceAccounts();
  // Function to display the menu
  function displayMenu() {
    console.log("\nChoose an option:");
    console.log("1. See bill summary totals");
    console.log("2. See all individual totals");
    console.log("3. See totals for a specific line");
    console.log("4. Exit");

    rl.question("Enter your choice (1, 2, 3, or 4): ", (choice) => {
      switch (choice) {
        case '1':
          // Print the plan summary
          console.log("\nPlan Summary:");
          console.log(`Plan: $${jsonData.planSummary.plan}`);
          console.log(`Equipment: $${jsonData.planSummary.equipment}`);
          console.log(`Services: $${jsonData.planSummary.services}`);
          console.log(`Total: $${jsonData.planSummary.total}`);
          break;

        case '2':
          // Print the total for each account
          console.log("\nIndividual Totals:");
          jsonData.accounts.forEach(account => {
            console.log(`Account: ${account.account}`);
            console.log(`Type: ${account.type}`);
            console.log(`Plan: $${account.plan}`);
            console.log(`Equipment: $${account.equipment}`);
            console.log(`Services: $${account.services}`);
            console.log(`Total: $${account.total}`);
            console.log("");
          });
          break;

        case '3':
          // Ask for the specific account number
          rl.question("Enter the account number: ", (accountNumber) => {
            const phoneNumber = formatAccountNumber(accountNumber);
            const account = jsonData.accounts.find(acc => acc.account === phoneNumber);
            if (account) {
              console.log(`\nAccount: ${account.account}`);
              console.log(`Type: ${account.type}`);
              console.log(`Plan: $${account.plan}`);
              console.log(`Equipment: $${account.equipment}`);
              console.log(`Services: $${account.services}`);
              console.log(`Total: $${account.total}`);
            } else {
              console.log("Account not found.");
            }
            displayMenu(); // Prompt the user again
          });
          return; // Prevent rl.close() from being called immediately

        case '4':
          console.log("Exiting...");
          rl.close();
          return;

        default:
          console.log("Invalid choice.");
      }

      displayMenu(); // Prompt the user again
    });
  }

  function formatAccountNumber(accountNumber) {
    // Define the regex pattern
    const pattern = /^(\d{3})[.\s-]?(\d{3})[.\s-]?(\d{4})$/;

    // Match the account number against the pattern
    const match = accountNumber.match(pattern);

    if (match) {
      // Format the account number
      return `(${match[1]}) ${match[2]}-${match[3]}`;
    } else {
      // Return an error message if the format is invalid
      return "Invalid account number format.";
    }
  }

  function updateVoiceAccounts() {
    // divide the total cost of the 5 voice accounts evenly between each account
    const voicePlanTotals = jsonData.accounts
      .filter(account => account.type === "Voice")
      .map(account => account.plan);

    const totalSum = voicePlanTotals.reduce((sum, total) => sum + total, 0);

    const updatedPlanAmount = totalSum / 5;

    jsonData.accounts.forEach((acct, i) => {
      if (acct.type === "Voice") {
        const thisAccount = jsonData.accounts[i];
        const { plan, equipment, services } = thisAccount;

        thisAccount.plan = updatedPlanAmount;
        thisAccount.total = roundUpToDecimalPlace((plan + equipment + services), 2);
      }
    });
  }

  function roundUpToDecimalPlace(number, decimalPlaces) {
    const factor = Math.pow(10, decimalPlaces);
    return Math.ceil(number * factor) / factor;
  }

  displayMenu(); // Initial menu display
});