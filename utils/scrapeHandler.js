const mongoose = require("mongoose");
const User = require("../models/User");
const Company = require("../models/Company");
const Store = require("../models/Store");
const Bill = require("../models/Bill");
const Item = require("../models/Item");
const geoApiCall = require("../utils/geocode");
const { parseBillAmount, parseBillItem } = require("../utils/billAmountParser");

async function parseAndInsertData(scrapedData, userId) {
  try {
    const user = await User.findById(userId);
    if (!user) throw new Error("Session failed, please login again!");

    const data = scrapedData
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line);

    if (data.length < 10) throw new Error("Insufficient data for processing");

    // Get and validate basic bill data first
    const companyPIB = data[1];
    const companyName = data[2];
    const storeDetails = data[3].split("-");
    const storeAddress = data[4];
    const storeCity = data[5];

    if (
      !companyPIB ||
      !companyName ||
      !storeDetails[0] ||
      !storeDetails[1] ||
      !storeAddress ||
      !storeCity
    ) {
      throw new Error("Missing required fields");
    }

    // Parse the date first so it's available throughout the function
    const dateLine = data.find((line) => line.startsWith("ПФР време:"));
    if (!dateLine) throw new Error("Failed to find date line");

    const dateString = dateLine.split(":").slice(1).join(":").trim();
    const [datePart, timePart] = dateString.split(" ");
    const [day, month, year] = datePart.split(".");
    const [hours, minutes, seconds] = timePart.split(":");
    const date = new Date(year, month - 1, day, hours, minutes, seconds);

    // Get other required fields
    const totalLine = data.find((line) => line.startsWith("Укупан износ:"));
    const pdvLine = data.find((line) =>
      line.startsWith("Укупан износ пореза:")
    );
    const pfrLine = data.find((line) => line.startsWith("ПФР број рачуна:"));

    if (!totalLine || !pdvLine || !pfrLine) {
      throw new Error("Failed to parse required fields from data");
    }

    const total = parseBillAmount(totalLine.split(":")[1].trim());
    const pdv = parseBillAmount(pdvLine.split(":")[1].trim());
    const pfr = pfrLine.split(":")[1].trim();

    // Check if bill already exists
    let bill = await Bill.findOne({ pfr: pfr });
    if (bill) throw new Error(`Bill with PFR ${pfr} already exists`);

    // Find or create company
    let company = await Company.findOne({ pib: parseInt(companyPIB) });
    if (!company) {
      company = new Company({
        name: companyName,
        pib: parseInt(companyPIB),
        stores: [],
      });
    }

    // Get coordinates and create/find store
    const { x, y } = await geoApiCall(storeAddress, storeCity);
    if (!x || !y)
      throw new Error(`Geocoding API error: Failed to get coordinates`);

    let store = await Store.findOne({
      storeId: storeDetails[0],
      company: company._id,
    });
    if (!store) {
      store = new Store({
        company: company._id,
        name: storeDetails[1],
        storeId: storeDetails[0],
        address: storeAddress,
        city: storeCity,
        x: x,
        y: y,
      });
      company.stores.push(store._id);
    }

    // Parse items
    const itemsIndexStart =
      data.indexOf("Назив   Цена         Кол.         Укупно") + 1;
    const itemsIndexEnd = data.indexOf(
      "----------------------------------------",
      itemsIndexStart
    );
    let items = [];
    let i = itemsIndexStart;

    while (i < itemsIndexEnd) {
      let itemName = data[i];
      i++;

      // Keep collecting name lines until we hit the price details
      while (
        i < itemsIndexEnd &&
        !data[i].match(/^\s*[\d,.]+\s+[\d,.]+\s+[\d,.]+/)
      ) {
        itemName += " " + data[i];
        i++;
      }

      if (i < itemsIndexEnd) {
        itemName = itemName.replace(/\s+/g, " ").trim();
        const itemDetails = data[i].trim().split(/\s+/);

        try {
          const {
            price: itemPrice,
            amount: itemAmount,
            total: itemTotal,
          } = parseBillItem(itemDetails);

          let item = await Item.findOne({ name: itemName });
          if (item) {
            const priceExists = item.prices.some(
              (priceEntry) =>
                priceEntry.price === itemPrice && priceEntry.date <= date
            );
            if (!priceExists) {
              item.prices.push({ date, price: itemPrice });
            }
          } else {
            item = new Item({
              name: itemName,
              prices: [{ date, price: itemPrice }],
            });
          }

          items.push({
            itemId: item._id,
            amount: itemAmount,
            total: itemTotal,
          });

          await item.save();
          i++;
        } catch (error) {
          console.error(
            `Failed to parse item "${itemName}" with details:`,
            itemDetails
          );
          throw error;
        }
      }
    }

    // Create and save the bill
    bill = new Bill({
      store: store._id,
      total,
      pdv,
      date,
      pfr,
      items,
    });

    await company.save();
    await store.save();
    await bill.save();

    if (!user.stores_visited.includes(store._id)) {
      user.stores_visited.push(store._id);
    }
    user.bills.push(bill._id);
    await user.save();

    console.log("Bill successfully scanned!");
  } catch (error) {
    console.error("Error in parseAndInsertData:", error.message);
    throw error;
  }
}

module.exports = parseAndInsertData;
