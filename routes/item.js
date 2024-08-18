const express = require("express");
const router = express.Router();
const Item = require("../models/Item");
const passport = require("passport");
const Response = require("../utils/responseHandler");

// Route to search items by name
router.get(
  "/search",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const { name } = req.query;
    if (!name) {
      return res
        .status(400)
        .json({ msg: "Please provide an item name to search." });
    }
    try {
      const items = await Item.find({ name: new RegExp(name, "i") });
      res.json(items);
    } catch (err) {
      console.error(err);
      res.status(500).send("Server error");
    }
  }
);
module.exports = router;
