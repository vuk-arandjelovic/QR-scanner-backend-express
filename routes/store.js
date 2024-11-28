const express = require("express");
const router = express.Router();
const Store = require("../models/Store");
const passport = require("passport");

router.get(
  "/getUserStores",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const stores = await Store.find({
        _id: { $in: req.user.stores_visited },
      }).populate("company");
      res.json(stores);
    } catch (err) {
      console.error(err);
      res.status(500).send("Server error");
    }
  }
);
module.exports = router;
