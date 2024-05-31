const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const parseAndInsertData = require("../utils/scrapeHandler");
const passport = require("passport");
const router = express.Router();

router.post(
  "/",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ msg: "Please provide a URL!" });
    }

    // Check if the URL starts with the correct prefix
    if (!url.startsWith("https://suf.purs.gov.rs/v/?vl=")) {
      return res.status(400).json({ msg: "QR code isn't a bill!" });
    }

    try {
      const { data } = await axios.get(url);
      const $ = cheerio.load(data);

      // Check if the data was loaded correctly
      const scrapedData = $("pre").text();
      if (!scrapedData) {
        return res.status(400).json({ msg: "Failed to retrieve bill data!" });
      }

      // Check if the scraped data has the minimum required length or some identifier
      if (scrapedData.split("\n").length < 10) {
        return res.status(400).json({ msg: "Incomplete bill data!" });
      }

      await parseAndInsertData(scrapedData, req.user._id);

      res.json({ msg: "Bill successfully scanned!" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: "Server error.", error: err.message });
    }
  }
);

module.exports = router;
