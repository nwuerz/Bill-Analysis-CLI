const fs = require('fs');
const { user1, user2, user3, user4, lines } = require('./users.js');

const mapBillTextToJson = text => {
    const lines = text.split('\n').map(line => line.trim());
    const planSummary = {};
    const account = {};
    const lineDetails = [];

    lines.forEach(line => {
        const parts = line.split(/\s+/);

        if (parts[0] === 'Totals') {
            planSummary.plan = parseFloat(parts[1].replace('$', ''));
            planSummary.equipment = parseFloat(parts[2].replace('$', ''));
            planSummary.services = parseFloat(parts[3].replace('$', ''));
            planSummary.total = parseFloat(parts[4].replace('$', ''));
        } else if (parts[0] === 'Account') {
            account.amount = parseFloat(parts[1].replace('$', ''));
        } else {
            const [accountNumber, type, plan, equipment, services, total] = parts;
            lineDetails.push({
                account: accountNumber,
                type: type,
                plan: parseFloat(plan.replace('$', '')),
                equipment: equipment !== '-' ? parseFloat(equipment.replace('$', '')) : 0,
                services: services !== '-' ? parseFloat(services.replace('$', '')) : 0,
                total: parseFloat(total.replace('$', ''))
            });
        }
    });

    const jsonObject = {
        planSummary,
        account,
        lines: lineDetails
    };

    fs.writeFileSync('data.json', JSON.stringify(jsonObject, null, 2));
    console.log('Data saved to data.json');
}

const displayMenu = (rl, jsonData) => {
    console.log("\nChoose an option:");
    console.log("1. See bill summary");
    console.log("2. See all lines");
    console.log("3. See totals for a specific line");
    console.log("4. See bill summary by person");
    console.log("5. Exit");

    rl.question("Enter your choice (1, 2, 3, 4, or 5): ", (choice) => {
        switch (choice) {
            case '1':
                console.log("\nPlan Summary:");
                console.log(`Plan: $${jsonData.planSummary.plan}`);
                console.log(`Equipment: $${jsonData.planSummary.equipment}`);
                console.log(`Services: $${jsonData.planSummary.services}`);
                console.log(`Total: $${jsonData.planSummary.total}`);
                setTimeout(() => {
                    displayMenu(rl, jsonData);
                }, 3000);
                break;

            case '2':
                console.log("\nIndividual Totals:");
                jsonData.lines.forEach(line => {
                    console.log(`Owner: ${line.owner}`);
                    console.log(`Phone Number: ${line.account}`);
                    console.log(`Type: ${line.type}`);
                    console.log(`Plan: $${line.plan}`);
                    console.log(`Equipment: $${line.equipment}`);
                    console.log(`Services: $${line.services}`);
                    console.log(`Total: $${line.total}`);
                    console.log("");
                });
                setTimeout(() => {
                    displayMenu(rl, jsonData);
                }, 3000);
                break;

            case '3':
                rl.question("Enter the account number: ", (input) => {
                    const phoneNumber = formatAccountNumber(input);
                    const line = jsonData.lines.find(line => line.account === phoneNumber);
                    if (line) {
                        console.log(`\nAccount: ${line.account}`);
                        console.log(`Type: ${line.type}`);
                        console.log(`Plan: $${line.plan}`);
                        console.log(`Equipment: $${line.equipment}`);
                        console.log(`Services: $${line.services}`);
                        console.log(`Total: $${line.total}`);
                    } else {
                        console.log("Phone number not found.");
                    }
                    setTimeout(() => {
                        displayMenu(rl, jsonData);
                    }, 3000);
                });
                break;

            case '4':
                let totalAmountDue = 0;
                console.log("\nUser Totals:");
                lines.forEach(line => {
                    const total = roundToNearestPenny(line.total, 2);
                    console.log(`Owner: ${line.name}`);
                    console.log(`Lines: ${line.lines}`);
                    console.log(`Total: $${total}`);
                    console.log("");
                    totalAmountDue += line.total;
                });
                console.log(`Total Amount Due: $${roundToNearestPenny(totalAmountDue, 2)}`);
                setTimeout(() => {
                    displayMenu(rl, jsonData);
                }, 3000);
                break;

            case '5':
                console.log("Exiting...");
                rl.close();
                break;

            default:
                console.log("Invalid choice.");
                setTimeout(() => {
                    displayMenu(rl, jsonData);
                }, 3000);
                break;
        }
    });
}

const updateJsonData = jsonData => {
    addUsersToJsonData(jsonData);
    updateVoiceAccounts(jsonData);
    calculateDifferenceAndAddToScottsBillLOL(jsonData);
    calculateUserTotals(jsonData);
    return jsonData
}

const addUsersToJsonData = jsonData => {
    jsonData.lines.forEach((line, i) => {
        const mobileNumber = line.account;

        if (user1.lines.includes(mobileNumber)) {
            jsonData.lines[i].owner = user1.name;
        } else if (user2.lines.includes(mobileNumber)) {
            jsonData.lines[i].owner = user2.name;
        } else if (user3.lines.includes(mobileNumber)) {
            jsonData.lines[i].owner = user3.name;
        } else if (user4.lines.includes(mobileNumber)) {
            jsonData.lines[i].owner = user4.name;
        } else if (user5.lines.includes(mobileNumber)) {
            jsonData.lines[i].owner = user5.name;
        }
    });
}

const handleFileReadError = err => {
    console.error('Error reading file:', err);
    return;
}

const updateVoiceAccounts = jsonData => {
    // divide the total cost of the 5 voice accounts evenly between each account
    const voicePlanTotals = jsonData.lines
        .filter(line => line.type === "Voice")
        .map(line => line.plan);
    const totalSum = voicePlanTotals.reduce((sum, total) => sum + total, 0);
    const updatedPlanAmount = roundToNearestPenny((roundToNearestPenny(totalSum, 2) + roundToNearestPenny(jsonData.account.amount, 2)) / voicePlanTotals.length, 2);

    jsonData.lines.forEach((line, i) => {
        if (line.type === "Voice") {
            const thisAccount = jsonData.lines[i];
            //refactor
            const { plan, equipment, services } = thisAccount;

            thisAccount.plan = updatedPlanAmount;
            thisAccount.total = updatedPlanAmount + equipment + services;
        }
    });
}

const calculateUserTotals = jsonData => {
    jsonData.lines.forEach(acct => {
        const { owner } = acct;
        const line = lines.filter(line => line.name === owner);
        line[0].total += acct.total;
    })
}

const formatAccountNumber = (phoneNumber) => {
    // Define the regex pattern
    const pattern = /^(\d{3})(\d{3})(\d{4})$/;

    // Match the account number against the pattern
    const match = phoneNumber.match(pattern);

    if (match) {
        // Format the phone number
        return `(${match[1]})${match[2]}-${match[3]}`;
    } else {
        // Return an error message if the format is invalid
        return "Invalid phone number format.";
    }
}

const roundToNearestPenny = (amount) => {
    const factor = 100; // factor for rounding to the nearest penny
    const thirdDecimalPlace = Math.floor((amount * 1000) % 10); // find the third decimal place

    if (thirdDecimalPlace >= 5) {
        return Math.ceil(amount * factor) / factor;
    } else {
        return Math.floor(amount * factor) / factor;
    }
}

const calculateDifferenceAndAddToScottsBillLOL = jsonData => {
    const actualTotal = jsonData.planSummary.total;
    let calculatedTotal = 0;

    jsonData.lines.forEach(line => {
        calculatedTotal += roundToNearestPenny(line.total);
    });

    if (calculatedTotal !== actualTotal) {
        const diff = roundToNearestPenny(actualTotal - calculatedTotal);
        const scottsLine = jsonData.lines.filter(line => line.account === user1.lines[0]);
        if (diff < 5.00) {
            scottsLine[0].plan += diff;
            scottsLine[0].total += diff;
        } else {
            console.log(`$${diff} discrepency found in bill!!`)
        }
    }
}

const getMultilineInput = (rl, prompt) => {
    return new Promise((resolve) => {
        let lines = [];
        console.log(prompt);
        rl.on('line', (line) => {
            if (line === '') { // If an empty line is entered, resolve the promise
                const input = lines.join('\n');
                resolve(input);
            } else {
                lines.push(line);
            }
        });
    });
}

const getBillText = rl => {
    return getMultilineInput(rl, 'Enter the text for the bill (end input with an empty line):')
        .then(inputText => {
            console.log('Captured inputText:', inputText);
            return inputText;
        })
        .catch(err => {
            console.error('Error processing input:', err);
        });
}

const init = async () => {
    const billText = await getBillText(rl);
    return billText
}

module.exports = { mapBillTextToJson, displayMenu, updateJsonData, handleFileReadError, init, getMultilineInput };  