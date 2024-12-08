const fs = require("fs");

function parseStoreAndLocation(data) {
  try {
    // First get the reliable data - PIB is always a 9-digit number
    const pibIndex = data.findIndex((line) => /^\d{9}$/.test(line));
    if (pibIndex === -1) throw new Error("Could not find PIB");
    const pib = parseInt(data[pibIndex], 10);
    const companyName = data[pibIndex + 1];

    // Find kasir line as our anchor
    const kasirIndex = data.findIndex(
      (line) =>
        line.toLowerCase().includes("касир:") ||
        line.toLowerCase().includes("kasir:")
    );
    if (kasirIndex === -1) throw new Error("Could not find kasir line");

    // Find store identifier line - look for 6+ digits followed by hyphen
    let storeLineIndex = -1;
    for (let i = pibIndex + 2; i < kasirIndex; i++) {
      // Start from pibIndex + 2 to skip company name
      if (/\d{6,}-/.test(data[i])) {
        storeLineIndex = i;
        break;
      }
    }
    if (storeLineIndex === -1)
      throw new Error("Could not find store identifier");

    // Split on first hyphen only
    const [storeIdPart, ...storeNameParts] = data[storeLineIndex].split("-");
    const storeId = storeIdPart.match(/\d+/)[0]; // Extract just the numbers
    const storeName = storeNameParts.join("-").trim(); // Keep everything after the first hyphen

    // Get address and city
    const addressStartIndex = storeLineIndex + 1;
    const cityIndex = kasirIndex - 1;

    let address = data[addressStartIndex].trim();
    let city = data[cityIndex].trim();

    // If there are lines between address and city, they're part of the address
    if (cityIndex > addressStartIndex + 1) {
      const additionalAddressLines = data.slice(
        addressStartIndex + 1,
        cityIndex
      );
      address = [address, ...additionalAddressLines].join(" ").trim();
    }

    return {
      pib,
      companyName,
      storeId,
      storeName,
      address,
      city,
      debug: {
        indices: {
          pib: pibIndex,
          store: storeLineIndex,
          addressStart: addressStartIndex,
          city: cityIndex,
          kasir: kasirIndex,
        },
        rawData: {
          storeLine: data[storeLineIndex],
          addressLines: data.slice(addressStartIndex, cityIndex),
          cityLine: data[cityIndex],
        },
      },
    };
  } catch (error) {
    console.error("Error parsing store and location:", error);
    throw error;
  }
}
function testParser(bills) {
  const results = [];
  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < bills.length; i++) {
    try {
      const bill = bills[i];
      const rawData = bill.rawData;

      // Get the lines that contain our raw store/address data
      const relevantLines = rawData.slice(
        bill.parsedData.debug?.indices?.store || 0,
        (bill.parsedData.debug?.indices?.kasir || rawData.length) + 1
      );

      const parsed = parseStoreAndLocation(rawData);
      const original = bill.parsedData;

      const comparison = {
        billIndex: i,
        success: true,
        differences: {},
        parsed,
        original,
        rawLines: relevantLines,
      };

      // Helper to add a difference with context
      const addDifference = (field, parsed, original, rawLine) => {
        if (parsed !== original) {
          comparison.differences[field] = {
            parsed,
            original,
            rawLine,
          };
          comparison.success = false;
        }
      };

      // For each field, show the relevant raw line from the receipt
      // that this data was parsed from
      const fieldsToCheck = [
        "pib",
        "companyName",
        "storeId",
        "storeName",
        "address",
        "city",
      ];
      fieldsToCheck.forEach((field) => {
        const relevantLine = relevantLines.find(
          (line) =>
            line.includes(parsed[field]) || line.includes(original[field])
        );
        addDifference(field, parsed[field], original[field], relevantLine);
      });

      if (comparison.success) {
        successCount++;
      } else {
        failureCount++;
      }

      results.push(comparison);
    } catch (error) {
      failureCount++;
      results.push({
        billIndex: i,
        success: false,
        error: error.message,
        rawData: bills[i].rawData,
      });
    }
  }

  // Create detailed analysis
  const analysis = {
    summary: {
      total: bills.length,
      success: successCount,
      failure: failureCount,
      successRate: `${((successCount / bills.length) * 100).toFixed(2)}%`,
    },
    failureCategories: {
      storeNameMismatch: 0,
      addressCitySwap: 0,
      multilineErrors: 0,
      parsingErrors: 0,
    },
    results,
  };

  // Analyze failure patterns
  results.forEach((result) => {
    if (!result.success) {
      if (result.differences.storeName) {
        analysis.failureCategories.storeNameMismatch++;
      }
      if (result.differences.address && result.differences.city) {
        analysis.failureCategories.addressCitySwap++;
      }
      if (result.error) {
        analysis.failureCategories.parsingErrors++;
      }
      // Check for multiline issues
      if (result.rawLines?.length > 3) {
        analysis.failureCategories.multilineErrors++;
      }
    }
  });

  return analysis;
}

// Load and parse the JSON file
const billsJson = fs.readFileSync("./bills.json", "utf8");
const bills = JSON.parse(billsJson);

// Run the test
const testResults = testParser(bills);

const logsDir = "./logs";
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const logFileName = `${logsDir}/parser_test_${timestamp}.json`;
fs.writeFileSync(logFileName, JSON.stringify(testResults, null, 2));

// Print summary to console
console.log("\nTest Summary:");
console.log(testResults.summary);
console.log(`\nFull results saved to: ${logFileName}`);
