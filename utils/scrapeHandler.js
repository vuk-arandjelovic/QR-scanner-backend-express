const mongoose = require("mongoose");
const User = require("../models/User"); // Assuming you have defined the models
const Company = require("../models/Company");
const Store = require("../models/Store");
const Bill = require("../models/Bill");
const Item = require("../models/Item");
const geoApiCall = require("../utils/geocode");

async function parseAndInsertData(scrapedData) {
  try {
    const data = scrapedData
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line);
    let company,
      store,
      bill,
      items = [];

    const companyPIB = data[1];
    const companyName = data[2];
    const storeDetails = data[3].split("-");
    const storeAddress = data[4];
    const storeCity = data[5];
    const total = parseFloat(
      data
        .find((line) => line.startsWith("Укупан износ:"))
        .split(":")[1]
        .trim()
        .replace(",", ".")
    );
    const pdv = parseFloat(
      data
        .find((line) => line.startsWith("Укупан износ пореза:"))
        .split(":")[1]
        .trim()
        .replace(",", ".")
    );
    const dateString = data
      .find((line) => line.startsWith("ПФР време:"))
      .split(":")
      .slice(1)
      .join(":")
      .trim();
    const [datePart, timePart] = dateString.split(" ");
    const [day, month, year] = datePart.split(".");
    const [hours, minutes, seconds] = timePart.split(":");
    const date = new Date(year, month - 1, day, hours, minutes, seconds);
    const pfr = data
      .find((line) => line.startsWith("ПФР број рачуна:"))
      .split(":")[1]
      .trim();
    // console.log({ total, pdv, dateString, date, pfr });

    company = new Company({
      name: companyName,
      pib: parseInt(companyPIB),
      stores: [],
    });
    const { x, y } = await geoApiCall(storeAddress, storeCity);
    if (!x || !y)
      throw new Error(`Geocoding API error: Failed to get coordinates`);
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

    const itemsIndexStart =
      data.indexOf("Назив   Цена         Кол.         Укупно") + 1;
    const itemsIndexEnd = data.indexOf(
      "----------------------------------------",
      itemsIndexStart
    );
    for (let i = itemsIndexStart; i < itemsIndexEnd; i += 2) {
      const itemName = data[i];
      const itemDetails = data[i + 1].split(/\s+/);
      const item = new Item({
        name: itemName,
        price: parseFloat(itemDetails[0]?.replace(",", ".")),
        amount: parseFloat(itemDetails[1]),
        total: parseFloat(itemDetails[2]?.replace(",", ".")),
      });
      items.push(item);
    }

    bill = new Bill({
      store: store._id,
      total: parseFloat(total),
      pdv: parseFloat(pdv),
      date,
      pfr,
      items: items.map((item) => item._id),
    });

    await company.save();
    await store.save();
    await Promise.all(items.map((item) => item.save()));
    await bill.save();

    console.log("Bill successfully scanned!");
  } catch (error) {
    console.error("Error scanning bill:", error.message);
  }
}

module.exports = parseAndInsertData;
