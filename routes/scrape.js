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
    if (!url) return res.status(400).json({ msg: "Please provide a URL!" });
    if (!url.startsWith("https://suf.purs.gov.rs/v/?vl="))
      return res.status(400).json({ msg: "QR code isn't a bill!" });
    try {
      const { data } = await axios.get(url);
      const $ = cheerio.load(data);
      const scrapedData = $("pre").text();

      if (!scrapedData)
        return res.status(400).json({ msg: "Failed to retrieve bill data!" });
      if (scrapedData.split("\n").length < 10)
        return res.status(400).json({ msg: "Incomplete bill data!" });

      await parseAndInsertData(scrapedData, req.user._id);
      res.json({ msg: "Bill successfully scanned!" });
    } catch (err) {
      console.error(err);
      res
        .status(500)
        .json({ msg: "Processing bill data failed.", error: err.message });
    }
  }
);

module.exports = router;
