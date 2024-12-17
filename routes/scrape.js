const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const parseAndInsertData = require("../utils/scrapeHandler");
const router = express.Router();
const Response = require("../utils/responseHandler");
const authMiddleware = require("../middleware/auth-wrapper");
const validateUrl = require("../utils/validateUrl");

router.post("/", authMiddleware, async (req, res) => {
  const { url } = req.body;

  // Validate URL
  if (!url) {
    return Response.json(res, {
      status: 400,
      message: "Please provide a URL!",
    });
  }

  if (!validateUrl(url)) {
    return Response.json(res, {
      status: 400,
      message: "QR code isn't a valid bill URL!",
    });
  }

  try {
    // Get initial HTML page
    const { data: html } = await axios.get(url);

    // Parse the bill data
    const result = await parseAndInsertData(html, req.user._id);

    // Return appropriate response based on parsing method
    return Response.json(res, {
      message: `Bill successfully scanned${
        result.metadata?.processingMethod === "fallback"
          ? " (using fallback method)"
          : ""
      }!`,
      response: {
        success: true,
        processingMethod: result.metadata?.processingMethod || "api",
        requiresReview: result.metadata?.requiresReview || false,
      },
    });
  } catch (err) {
    console.error("Bill processing error:", err);

    // Handle specific error cases
    if (err.message.includes("Failed to retrieve")) {
      return Response.json(res, {
        status: 400,
        message: "Failed to retrieve bill data!",
      });
    }

    if (
      err.message.includes("Insufficient") ||
      err.message.includes("Incomplete")
    ) {
      return Response.json(res, {
        status: 400,
        message: "Incomplete bill data!",
      });
    }

    return Response.json(res, {
      status: 500,
      message: err.message || "Processing bill data failed.",
    });
  }
});

module.exports = router;
