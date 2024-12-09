const User = require("../models/User");
const Company = require("../models/Company");
const Store = require("../models/Store");
const Bill = require("../models/Bill");
const Item = require("../models/Item");
const geoApiCall = require("../utils/geocode");
const { parseBillAmount, parseBillItem } = require("../utils/billAmountParser");
const { logBillData } = require("../utils/billLogger");

/**
 * Parses and saves bill data from scraped text
 * @param {string} scrapedData - Raw text data from the bill
 * @param {string} userId - MongoDB ObjectId of the user
 */
async function parseAndInsertData(scrapedData, userId) {
  try {
    // Initial data cleanup
    const data = scrapedData
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line);
    if (data.length < 10) {
      throw new Error("Insufficient data for processing");
    }

    // Find user first to validate session
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("Session failed, please login again!");
    }

    // Extract and validate basic bill data
    const basicData = extractBasicData(data);
    console.log(data);
    console.log(basicData);
    await logBillData(data, basicData);
    return;
    validateBasicData(basicData);

    // Check if bill already exists
    const existingBill = await Bill.findOne({ pfr: basicData.pfr });
    if (existingBill) {
      throw new Error(`Bill with PFR ${basicData.pfr} already exists`);
    }

    // Process company and store
    const { company, store } = await processCompanyAndStore(basicData);

    // Process items
    const items = await processItems(data, basicData.date);

    // Create bill
    const bill = new Bill({
      store: store._id,
      total: basicData.total,
      pdv: basicData.pdv,
      date: basicData.date,
      pfr: basicData.pfr,
      items,
    });

    // Save everything in order
    await company.save();
    await store.save();
    await bill.save();

    // Update user data
    if (!user.stores_visited.includes(store._id)) {
      user.stores_visited.push(store._id);
    }
    user.bills.push(bill._id);
    await user.save();

    console.log("Bill successfully scanned!");
    return bill;
  } catch (error) {
    console.error("Error in parseAndInsertData:", error);
    throw error;
  }
}

/**
 * Extracts basic data from bill text
 */
function extractBasicData(data) {
  try {
    // Find PIB - first number that's exactly 9 digits
    const pibIndex = data.findIndex((line) => /^\d{9}$/.test(line));
    if (pibIndex === -1) throw new Error("Could not find PIB");
    const pib = parseInt(data[pibIndex], 10);

    // Company name is always right after PIB
    const companyName = data[pibIndex + 1];

    // Find kasir line to use as bottom anchor
    const kasirIndex = data.findIndex(
      (line) =>
        line.toLowerCase().includes("касир:") ||
        line.toLowerCase().includes("kasir:")
    );
    if (kasirIndex === -1) throw new Error("Could not find kasir line");

    // Find store info - look for line with 6+ digits and hyphen
    let storeLineIndex = -1;
    for (let i = pibIndex + 2; i < kasirIndex; i++) {
      if (/\d{6,}-/.test(data[i])) {
        storeLineIndex = i;
        break;
      }
    }
    if (storeLineIndex === -1)
      throw new Error("Could not find store identifier");

    // Get store ID and full name
    const storeLine = data[storeLineIndex];
    const [storeIdPart, ...restOfLine] = storeLine.split("-");
    const storeId = storeIdPart.match(/\d+/)[0]; // Extract just the numbers
    const storeName = restOfLine.join("-").trim(); // Keep the rest as-is

    // Get city and address - city is always one line above kasir
    const cityIndex = kasirIndex - 1;
    const city = data[cityIndex].trim();

    // Address is between store info and city
    const addressLines = data.slice(storeLineIndex + 1, cityIndex);
    const address = addressLines.map((line) => line.trim()).join(" "); // Combine all lines, trim each, and join with spaces

    return {
      pib,
      companyName,
      storeId,
      storeName,
      address,
      city,
    };
  } catch (error) {
    throw new Error(`Failed to extract basic data: ${error.message}`);
  }
}

/**
 * Validates extracted basic data
 */
function validateBasicData(data) {
  const required = [
    "pib",
    "companyName",
    "storeId",
    "storeName",
    "address",
    "city",
    "date",
    "pfr",
    "total",
    "pdv",
  ];

  const missing = required.filter((field) => !data[field]);
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(", ")}`);
  }

  if (data.pib.toString().length !== 9) {
    throw new Error("Invalid PIB format");
  }

  if (data.total < 0 || data.pdv < 0) {
    throw new Error("Invalid total or PDV amount");
  }
}

/**
 * Processes company and store data
 */
async function processCompanyAndStore(basicData) {
  // Find or create company
  let company = await Company.findOne({ pib: basicData.pib });
  if (!company) {
    company = new Company({
      name: basicData.companyName,
      pib: basicData.pib,
      stores: [],
    });
  }

  // Get coordinates for the store
  const { x, y } = await geoApiCall(basicData.address, basicData.city);
  if (!x || !y) {
    throw new Error("Failed to get store coordinates");
  }

  // Find or create store
  let store = await Store.findOne({
    storeId: basicData.storeId,
    company: company._id,
  });

  if (!store) {
    store = new Store({
      company: company._id,
      name: basicData.storeName,
      storeId: basicData.storeId,
      address: basicData.address,
      city: basicData.city,
      x,
      y,
    });
    company.stores.push(store._id);
  }

  return { company, store };
}

/**
 * Processes items from bill text
 */
async function processItems(data, billDate) {
  const itemsIndexStart =
    data.findIndex(
      (line) =>
        (line.includes("Назив") &&
          line.includes("Цена") &&
          line.includes("Кол.")) ||
        (line.includes("Naziv") &&
          line.includes("Cena") &&
          line.includes("Kol."))
    ) + 1;

  const itemsIndexEnd = data.findIndex(
    (line) => line.includes("----------------------------------------"),
    itemsIndexStart
  );

  if (itemsIndexStart <= 0 || itemsIndexEnd <= 0) {
    throw new Error("Could not locate items section");
  }

  const items = [];
  let i = itemsIndexStart;
  let currentItemName = [];

  while (i < itemsIndexEnd) {
    // Skip empty lines
    if (!data[i].trim()) {
      i++;
      continue;
    }

    // Collect item name lines until we hit the price details
    currentItemName = [data[i]];
    i++;

    while (
      i < itemsIndexEnd &&
      !data[i].match(/^\s*[\d.,]+\s+[\d.,]+\s+[\d.,]+/)
    ) {
      if (data[i].trim()) {
        currentItemName.push(data[i]);
      }
      i++;
    }

    if (i < itemsIndexEnd) {
      const itemName = currentItemName.join(" ").replace(/\s+/g, " ").trim();
      const itemDetails = data[i].trim().split(/\s+/);

      try {
        const { price, amount, total } = parseBillItem(itemDetails);

        // Find or create item
        let item = await Item.findOne({ name: itemName });
        if (item) {
          const priceExists = item.prices.some(
            (entry) => entry.price === price && entry.date <= billDate
          );
          if (!priceExists) {
            item.prices.push({ date: billDate, price });
            await item.save();
          }
        } else {
          item = new Item({
            name: itemName,
            prices: [{ date: billDate, price }],
          });
          await item.save();
        }

        items.push({
          itemId: item._id,
          amount,
          total,
        });
      } catch (error) {
        console.error(`Failed to process item "${itemName}":`, error);
        throw error;
      }
      i++;
    }
  }

  if (items.length === 0) {
    throw new Error("No items found in bill");
  }

  return items;
}

module.exports = parseAndInsertData;
