const express = require("express");
const router = express.Router();
const Item = require("../models/Item");
const Bill = require("../models/Bill");
const passport = require("passport");
const Response = require("../utils/responseHandler");

router.get(
  "/getAll",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const items = await Item.find({});
      res.json(items);
    } catch (err) {
      console.error(err);
      res.status(500).send("Server error");
    }
  }
);
router.get(
  "/getFromBill",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const { billId } = req.query; // Changed from req.billId to req.query
      if (!billId) {
        return res
          .status(400)
          .json({ msg: "Please provide a bill ID to search." });
      }
      const bill = await Bill.findById(billId).populate({
        path: "items.itemId",
        model: "Item",
      });

      if (!bill) {
        return res.status(404).json({ msg: "Bill not found" });
      }

      const items = bill.items.map((item) => ({
        itemId: item.itemId._id,
        name: item.itemId.name,
        amount: item.amount,
        total: item.total,
      }));

      res.json(items);
    } catch (err) {
      console.error(err);
      res.status(500).send("Server error");
    }
  }
);
// Search items by name
router.get(
  "/search",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const { name } = req.query;
      if (!name) {
        return Response.json(res, {
          status: 400,
          message: "Search query is required",
        });
      }

      // Case-insensitive search using regex
      const items = await Item.find({
        name: { $regex: name, $options: "i" },
      }).sort({ "prices.date": -1 });

      // Transform items to include latest price info
      const transformedItems = items.map((item) => {
        const plainItem = item.toObject();
        plainItem.prices = plainItem.prices.sort(
          (a, b) => new Date(b.date) - new Date(a.date)
        );
        return plainItem;
      });

      Response.json(res, {
        status: 200,
        message: "Items found",
        response: transformedItems,
      });
    } catch (err) {
      console.error(err);
      Response.json(res, {
        status: 500,
        message: "Server error",
      });
    }
  }
);

module.exports = router;
