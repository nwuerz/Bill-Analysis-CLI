const fs = require('fs');
const { users } = require('./users.js');

let oneTimeChargesArePresent;
let lateFee;

const processText = inputText => {
    let processedText = inputText.replace(/\)\s+/g, ')');

    processedText = processedText.replace(/Mobile\s+Internet/g, 'MobileInternet');

    let jsonObject = textToJson(processedText);

    fs.writeFileSync('output.json', JSON.stringify(jsonObject, null, 2));
}

const textToJson = text => {
    const lines = text.split('\n').map(line => line.trim());
    const planSummary = {};
    const account = {};
    const lineDetails = [];
    lines.forEach(line => {
        const parts = line.split(/\s+/);

        if (parts[0] === 'Totals') {
            oneTimeChargesArePresent = parts.length === 6 ? true : false;

            planSummary.plan = parseFloat(parts[1].replace('$', ''));
            planSummary.equipment = parseFloat(parts[2].replace('$', ''));
            planSummary.services = parseFloat(parts[3].replace('$', ''));

            if (oneTimeChargesArePresent) {
                planSummary.oneTimeCharges = parseFloat(parts[4].replace('$', ''));
                planSummary.total = parseFloat(parts[5].replace('$', ''));
            } else {
                planSummary.total = parseFloat(parts[4].replace('$', ''));
            }
        } else if (parts[0] === 'Account') {
            account.amount = parseFloat(parts[1].replace('$', ''));
        } else {
            if (oneTimeChargesArePresent) {
                const [accountNumber, type, plan, equipment, services, oneTimeCharges, total] = parts;
                lineDetails.push({
                    account: accountNumber,
                    type: type,
                    plan: parseFloat(plan.replace('$', '')),
                    equipment: equipment !== '-' ? parseFloat(equipment.replace('$', '')) : 0,
                    services: services !== '-' ? parseFloat(services.replace('$', '')) : 0,
                    oneTimeCharges: oneTimeCharges !== '-' ? parseFloat(services.replace('$', '')) : 0,
                    total: parseFloat(total.replace('$', ''))
                });
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
        }
    });

    const jsonObject = {
        planSummary,
        account,
        lines: lineDetails
    };

    fs.writeFileSync('data.json', JSON.stringify(jsonObject, null, 2));
    console.log('Input processed successfully...');
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
                }, 2000);
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
                }, 2000);
                break;

            case '3':
                rl.question("Enter the phone number: ", (input) => {
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
                    }, 2000);
                });
                break;

            case '4':
                let totalAmountDue = 0;
                console.log("\nUser Totals:");
                users.forEach(user => {
                    const total = roundToNearestPenny(user.total, 2);
                    console.log(`Owner: ${user.name}`);
                    console.log(`Lines: ${user.lines}`);
                    console.log(`Total: $${total}`);
                    console.log("");
                    totalAmountDue += user.total;
                });
                console.log(`Total Amount Due: $${roundToNearestPenny(totalAmountDue, 2)}`);
                if (oneTimeChargesArePresent) {
                    console.log(`Total Does Not Include the $${lateFee} late fee`);
                }
                setTimeout(() => {
                    displayMenu(rl, jsonData);
                }, 2000);
                break;

            case '5':
                console.log("Exiting...");
                rl.close();
                break;

            default:
                console.log("Invalid choice.");
                setTimeout(() => {
                    displayMenu(rl, jsonData);
                }, 2000);
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
    jsonData.lines.forEach(line => {
        const matchingUser = users.filter(user => user.lines.includes(line.account));
        line.owner = matchingUser[0].name;
    })
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
            const { equipment, services } = thisAccount;

            thisAccount.plan = updatedPlanAmount;
            thisAccount.total = updatedPlanAmount + equipment + services;
        }
    });
}

const calculateUserTotals = jsonData => {
    jsonData.lines.forEach(line => {
        const { owner } = line;
        users.forEach(user => {
            if (user.name === owner) {
                user.total += line.total;
            }
        });
    })
}

const formatAccountNumber = phoneNumber => {
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

const roundToNearestPenny = amount => {
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
            if (oneTimeChargesArePresent) {
                lateFee = diff;
                setTimeout(() => {
                    console.log(`$${diff} late fee found`);
                }, 1000);
            } else {
                console.log(`$${diff} discrepency found in bill!!`);
            }
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

const init = async rl => {
    try {
        const displayTimeout = lateFee === null ? 1000 : 2000;
        const billText = await getMultilineInput(rl, 'Copy the "THIS BILL SUMMARY" section from the bill (on page 2) and paste it here, then press enter twice:');
        processText(billText)

        fs.readFile('data.json', 'utf8', (err, data) => {
            if (err) handleFileReadError(err);
            const jsonData = JSON.parse(data);
            var updatedJsonData = updateJsonData(jsonData);
            setTimeout(() => {
                displayMenu(rl, updatedJsonData);
            }, displayTimeout);
        })
    } catch (error) {
        console.log(error);
    }
}

module.exports = { init };  