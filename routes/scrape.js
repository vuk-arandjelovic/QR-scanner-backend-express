const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const router = express.Router();

router.post("/scrape", async (req, res) => {
  const url = req.body;

  if (!url) {
    return res.status(400).json({ msg: "Please provide a URL" });
  }

  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    // Example: Extracting text from a specific element
    const scrapedData = $(selector).text();

    res.json({ data: scrapedData });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

module.exports = router;
