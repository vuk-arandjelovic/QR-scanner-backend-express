const axios = require("axios");
const cheerio = require("cheerio");
const User = require("../models/User");
const Company = require("../models/Company");
const Store = require("../models/Store");
const Bill = require("../models/Bill");
const Item = require("../models/Item");
const geoApiCall = require("../utils/geocode");
const { parseBillAmount, parseBillItem } = require("../utils/billAmountParser");

async function parseAndInsertData(html, userId) {
  try {
    // Find user
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("Session failed, please login again!");
    }
    console.log("Found user:", user);

    const $ = cheerio.load(html);

    // Extract basic data from HTML first
    const basicData = extractBasicDataFromHtml($);
    console.log("Extracted basic data:", basicData);
    const existingBill = await Bill.findOne({ pfr: basicData.pfr });
    if (existingBill) {
      throw new Error(`Bill with PFR ${basicData.pfr} already exists`);
    }

    // Process company and store
    const { company, store } = await processCompanyAndStore(basicData);

    // Try to get items via API first, fallback to text parsing if it fails
    let items;
    try {
      items = await getItemsViaApi($, basicData.date);
    } catch (apiError) {
      console.log(
        "API items fetch failed, using text parsing:",
        apiError.message
      );
      items = await getItemsViaText($("pre").text(), basicData.date);
    }

    // Create and save bill
    const bill = await saveBill(basicData, store, items, user);

    return bill;
  } catch (error) {
    console.error("Error in bill parsing:", error);
    throw error;
  }
}

function extractBasicDataFromHtml($) {
  // Extract company name from the specific HTML structure
  const companyName = $('strong:contains("Предузеће:")')
    .closest("p")
    .find(".badge")
    .text()
    .trim();

  // Extract PDV from the text representation
  const preText = $("pre").text();
  const lines = preText.split("\n");
  const pdvLine = lines.find(
    (line) =>
      line.includes("Укупан износ пореза:") ||
      line.includes("Ukupan iznos poreza:")
  );
  const pdv = pdvLine ? parseBillAmount(pdvLine.split(":")[1].trim()) : 0;
  // Get the date string
  const dateStr = $("#sdcDateTimeLabel").text().trim();

  // 🚀 REFACATORED DATE PARSING: Use regex to extract components cleanly
  // Matches: DD.MM.YYYY. HH:MM:SS
  const match = dateStr.match(
    /(\d{1,2})\.(\d{1,2})\.(\d{4})\.\s*(\d{1,2}):(\d{1,2}):(\d{1,2})/
  );

  if (!match) {
    throw new Error(`Invalid date format: ${dateStr}`);
  }

  // Destructure parts: [0] is full match, [1] is day, [2] is month, etc.
  // Note: Month is parsed as month - 1 because JS Date months are 0-based.
  const [
    ,
    // Skip full match
    day,
    month,
    year,
    hours,
    minutes,
    seconds,
  ] = match.map((val, index) => {
    // Convert to number; subtract 1 from month (index 2)
    return index === 2 ? parseInt(val, 10) - 1 : parseInt(val, 10);
  });

  const date = new Date(year, month, day, hours, minutes, seconds);

  const basicData = {
    pib: $("#tinLabel").text().trim(),
    companyName,
    storeId: $("#shopFullNameLabel").text().trim().split("-")[0]?.trim(),
    storeName: $("#shopFullNameLabel").text().trim().split("-")[1]?.trim(),
    address: $("#addressLabel").text().trim(),
    city: $("#cityLabel").text().trim(),
    date: date,
    total: parseBillAmount($("#totalAmountLabel").text().trim()),
    pdv,
    pfr: $("#invoiceNumberLabel").text().trim(),
  };

  if (!basicData.companyName || !basicData.pib || !basicData.storeId) {
    throw new Error("Missing essential bill data");
  }

  return basicData;
}

async function getItemsViaApi($, billDate) {
  // Extract token and invoice number
  const scriptContent = $('script:contains("viewModel")').text();
  const tokenMatch = scriptContent.match(/Token\('([^']+)'\)/);
  const invoiceMatch = scriptContent.match(/InvoiceNumber\('([^']+)'\)/);

  if (!tokenMatch || !invoiceMatch) {
    throw new Error("Could not extract token or invoice number");
  }

  // Get items data from specifications endpoint
  const specResponse = await axios.post(
    "https://suf.purs.gov.rs/specifications",
    {
      invoiceNumber: invoiceMatch[1],
      token: tokenMatch[1],
    },
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  return processApiItems(specResponse.data.items, billDate);
}

async function getItemsViaText(preText, billDate) {
  const lines = preText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line);

  const itemsStart =
    lines.findIndex(
      (line) =>
        line.includes("Назив") && line.includes("Цена") && line.includes("Кол.")
    ) + 1;

  const itemsEnd = lines.findIndex(
    (line) => line.includes("----------------------------------------"),
    itemsStart
  );

  if (itemsStart <= 0 || itemsEnd <= 0) {
    throw new Error("Could not locate items section");
  }

  return processTextItems(lines.slice(itemsStart, itemsEnd), billDate);
}

async function processApiItems(apiItems, billDate) {
  const items = [];
  const itemsToSave = [];

  for (const apiItem of apiItems) {
    let item = await Item.findOne({ name: apiItem.name });
    let needsSaving = false;

    if (!item) {
      item = new Item({
        name: apiItem.name,
        prices: [{ date: billDate, price: apiItem.unitPrice }],
      });
      needsSaving = true;
    } else {
      const priceExists = item.prices.some(
        (entry) => entry.price === apiItem.unitPrice && entry.date <= billDate
      );
      if (!priceExists) {
        item.prices.push({ date: billDate, price: apiItem.unitPrice });
        needsSaving = true;
      }
    }

    if (needsSaving) {
      itemsToSave.push(item);
    }

    items.push({
      itemId: item._id,
      amount: apiItem.quantity,
      total: apiItem.total,
    });
  }

  if (itemsToSave.length > 0) {
    await Promise.all(itemsToSave.map((item) => item.save()));
  }
  console.log("Items parsed from API:", items);
  return items;
}

async function processTextItems(itemLines, billDate) {
  const items = [];
  let currentItemName = [];

  for (let i = 0; i < itemLines.length; i++) {
    if (!itemLines[i].trim()) continue;

    // Collect item name lines
    currentItemName = [itemLines[i]];
    i++;

    while (
      i < itemLines.length &&
      !itemLines[i].match(/^\s*[\d,.]+\s+[\d,.]+\s+[\d,.]+/)
    ) {
      if (itemLines[i].trim()) {
        currentItemName.push(itemLines[i]);
      }
      i++;
    }

    if (i < itemLines.length) {
      const itemName = currentItemName.join(" ").replace(/\s+/g, " ").trim();
      const itemDetails = itemLines[i].trim().split(/\s+/);

      try {
        const { price, amount, total } = parseBillItem(itemDetails);

        let item = await Item.findOne({ name: itemName });
        if (!item) {
          item = new Item({
            name: itemName,
            prices: [{ date: billDate, price }],
          });
        } else {
          const priceExists = item.prices.some(
            (entry) => entry.price === price && entry.date <= billDate
          );
          if (!priceExists) {
            item.prices.push({ date: billDate, price });
          }
        }
        await item.save();

        items.push({
          itemId: item._id,
          amount,
          total,
        });
      } catch (error) {
        console.error(`Failed to process item "${itemName}":`, error);
        throw error;
      }
    }
  }

  if (items.length === 0) {
    throw new Error("No items found in bill");
  }
  console.log("Items parsed from text:", items);
  return items;
}

async function saveBill(basicData, store, items, user) {
  // Create bill
  const bill = new Bill({
    store: store._id,
    total: basicData.total,
    pdv: basicData.pdv,
    date: basicData.date,
    pfr: basicData.pfr,
    items,
  });

  // Save bill
  await bill.save();
  console.log("Bill saved:", bill);

  // Update user data
  if (!user.stores_visited.includes(store._id)) {
    user.stores_visited.push(store._id);
  }
  user.bills.push(bill._id);
  await user.save();

  return bill;
}

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
    console.log("Company and store created:", company, store);
    await company.save();
    await store.save();
  }

  return { company, store };
}

module.exports = parseAndInsertData;
