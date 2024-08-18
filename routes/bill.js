const express = require("express");
const router = express.Router();
const Bill = require("../models/Bill");
const passport = require("passport");
const Response = require("../utils/responseHandler");

// TODO: Add query filter for bill
router.get(
  "/getUserBills",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const bills = await Bill.find({ _id: { $in: req.user.bills } });
      res.json(bills);
    } catch (err) {
      console.error(err);
      res.status(500).send("Server error");
    }
  }
);
// Get a single bill by ID
router.get(
  "/:id",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const bill = await Bill.findById(req.params.id)
        .populate("store")
        .populate("items");
      if (!bill) return res.status(404).json({ msg: "Bill not found" });
      res.json(bill);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);
module.exports = router;
