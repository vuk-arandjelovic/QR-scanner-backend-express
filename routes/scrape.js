const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const parseAndInsertData = require("../utils/scrapeHandler");
const router = express.Router();

router.post("/", async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ msg: "Please provide a URL" });
  }

  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    // Extracting text from a specific element
    const scrapedData = $("pre").text();
    // Pass scraped data to the parsing and inserting function
    await parseAndInsertData(scrapedData);
    res.json({ msg: "Data successfully scraped and stored in the database" });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

module.exports = router;
