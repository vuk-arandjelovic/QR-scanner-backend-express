const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const parseAndInsertData = require("../utils/scrapeHandler");
const passport = require("passport");
const router = express.Router();
const Response = require("../utils/responseHandler");

router.post(
  "/",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const { url } = req.body;
    if (!url)
      return Response.json(res, {
        status: 400,
        message: "Please provide a URL!",
      });
    if (!url.startsWith("https://suf.purs.gov.rs/v/?vl="))
      return Response.json(res, {
        status: 400,
        message: "QR code isn't a valid bill URL!",
      });
    try {
      const { data } = await axios.get(url);
      const $ = cheerio.load(data);
      const scrapedData = $("pre").text();

      if (!scrapedData)
        return Response.json(res, {
          status: 400,
          message: "Failed to retrieve bill data!",
        });
      if (scrapedData.split("\n").length < 10)
        return Response.json(res, {
          status: 400,
          message: "Incomplete bill data!",
        });

      await parseAndInsertData(scrapedData, req.user._id);
      return Response.json(res, {
        message: "Bill successfully scanned!",
        response: { success: true },
      });
    } catch (err) {
      console.error(err);
      return Response.json(res, {
        status: 500,
        message: err.message || "Processing bill data failed.",
      });
    }
  }
);

module.exports = router;
