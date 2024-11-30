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
      return Response.json(res, {
        message: "Items found",
        response: items,
      });
    } catch (err) {
      console.error(err);
      return Response.json(res, {
        status: 500,
        message: "Server error",
      });
    }
  }
);
router.get(
  "/getFromBill",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const { billId } = req.query;
      if (!billId) {
        return Response.json(res, {
          status: 400,
          message: "Please provide a bill ID to search.",
        });
      }
      const bill = await Bill.findById(billId).populate({
        path: "items.itemId",
        model: "Item",
      });

      if (!bill) {
        return Response.json(res, {
          status: 404,
          message: "Bill not found",
        });
      }

      const items = bill.items.map((item) => ({
        itemId: item.itemId._id,
        name: item.itemId.name,
        amount: item.amount,
        total: item.total,
      }));

      return Response.json(res, {
        message: "Items found",
        response: items,
      });
    } catch (err) {
      console.error(err);
      return Response.json(res, {
        status: 500,
        message: "Server error",
      });
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

      return Response.json(res, {
        message: "Items found",
        response: transformedItems,
      });
    } catch (err) {
      console.error(err);
      return Response.json(res, {
        status: 500,
        message: "Server error",
      });
    }
  }
);

module.exports = router;
