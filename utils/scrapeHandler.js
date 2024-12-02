const User = require("../models/User");
const Company = require("../models/Company");
const Store = require("../models/Store");
const Bill = require("../models/Bill");
const Item = require("../models/Item");
const geoApiCall = require("../utils/geocode");
const { parseBillAmount, parseBillItem } = require("../utils/billAmountParser");

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
    console.log(data);
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
    // Find PIB (could be in different formats)
    const pib = data.find((line) => /^\d{9}$/.test(line.trim()));

    // Find company name (usually the line after PIB)
    const pibIndex = data.findIndex((line) => line === pib);
    const companyName = data[pibIndex + 1];

    // Extract store details
    const storeLineIndex = data.findIndex((line) => /-/.test(line));
    const storeLine = data[storeLineIndex];
    const [storeId, storeName] = storeLine.split("-").map((s) => s.trim());

    // Get address and city
    const address = data[storeLineIndex + 1];
    const city = data[storeLineIndex + 2];

    // Parse date and time
    const dateLine = data.find(
      (line) => line.includes("ПФР време:") || line.includes("PFR vreme:")
    );
    const dateString = dateLine.split(":").slice(1).join(":").trim();
    const [datePart, timePart] = dateString.split(" ");
    const [day, month, year] = datePart.split(".");
    const [hours, minutes, seconds] = timePart.split(":");
    const date = new Date(year, month - 1, day, hours, minutes, seconds);

    // Get PFR number
    const pfrLine = data.find(
      (line) =>
        line.includes("ПФР број рачуна:") || line.includes("PFR broj racuna:")
    );
    const pfr = pfrLine.split(":")[1].trim();

    // Get total and PDV
    const totalLine = data.find(
      (line) =>
        line.startsWith("Укупан износ:") || line.startsWith("Ukupan iznos:")
    );
    const pdvLine = data.find(
      (line) =>
        line.startsWith("Укупан износ пореза:") ||
        line.startsWith("Ukupan iznos poreza:")
    );

    const total = parseBillAmount(totalLine.split(":")[1].trim());
    const pdv = parseBillAmount(pdvLine.split(":")[1].trim());

    return {
      pib: parseInt(pib),
      companyName,
      storeId,
      storeName,
      address,
      city,
      date,
      pfr,
      total,
      pdv,
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
