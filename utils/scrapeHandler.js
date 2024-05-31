const mongoose = require("mongoose");
const User = require("../models/User"); // Assuming you have defined the models
const Company = require("../models/Company");
const Store = require("../models/Store");
const Bill = require("../models/Bill");
const Item = require("../models/Item");
const geoApiCall = require("../utils/geocode");

async function parseAndInsertData(scrapedData, userId) {
  try {
    const user = await User.findById(userId);
    if (!user) throw new Error("Session failed, please login again!");
    const data = scrapedData
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line);

    // Safeguard checks
    if (data.length < 10) {
      throw new Error("Insufficient data for processing");
    }

    let company,
      store,
      bill,
      items = [];

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

    const totalLine = data.find((line) => line.startsWith("Укупан износ:"));
    const pdvLine = data.find((line) =>
      line.startsWith("Укупан износ пореза:")
    );
    const dateLine = data.find((line) => line.startsWith("ПФР време:"));
    const pfrLine = data.find((line) => line.startsWith("ПФР број рачуна:"));

    if (!totalLine || !pdvLine || !dateLine || !pfrLine) {
      throw new Error("Failed to parse required fields from data");
    }

    const total = parseFloat(totalLine.split(":")[1].trim().replace(",", "."));
    const pdv = parseFloat(pdvLine.split(":")[1].trim().replace(",", "."));
    const dateString = dateLine.split(":").slice(1).join(":").trim();
    const [datePart, timePart] = dateString.split(" ");
    const [day, month, year] = datePart.split(".");
    const [hours, minutes, seconds] = timePart.split(":");
    const date = new Date(year, month - 1, day, hours, minutes, seconds);
    const pfr = pfrLine.split(":")[1].trim();

    // Check if the company already exists
    company = await Company.findOne({ pib: parseInt(companyPIB) });
    if (!company) {
      company = new Company({
        name: companyName,
        pib: parseInt(companyPIB),
        stores: [],
      });
    }

    const { x, y } = await geoApiCall(storeAddress, storeCity);
    if (!x || !y)
      throw new Error(`Geocoding API error: Failed to get coordinates`);

    // Check if the store already exists
    store = await Store.findOne({
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

    // Check if the bill already exists
    bill = await Bill.findOne({ pfr: pfr });
    if (bill) {
      throw new Error(`Bill with PFR ${pfr} already exists`);
    }

    const itemsIndexStart =
      data.indexOf("Назив   Цена         Кол.         Укупно") + 1;
    const itemsIndexEnd = data.indexOf(
      "----------------------------------------",
      itemsIndexStart
    );

    for (let i = itemsIndexStart; i < itemsIndexEnd; i += 2) {
      const itemName = data[i];
      const itemDetails = data[i + 1].split(/\s+/);
      const itemPrice = parseFloat(itemDetails[0]?.replace(",", "."));
      const itemAmount = parseFloat(itemDetails[1]);
      const itemTotal = parseFloat(itemDetails[2]?.replace(",", "."));

      let item = await Item.findOne({ name: itemName });

      if (item) {
        // Check if there is a price entry on or before the bill date with the same price
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
    }

    bill = new Bill({
      store: store._id,
      total: parseFloat(total),
      pdv: parseFloat(pdv),
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
    // console.error("Error scanning bill:", error.message);
    throw error;
  }
}

module.exports = parseAndInsertData;
