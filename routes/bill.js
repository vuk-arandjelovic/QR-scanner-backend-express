const express = require("express");
const router = express.Router();
const Bill = require("../models/Bill");
const User = require("../models/User");
const passport = require("passport");
const Response = require("../utils/responseHandler");

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
router.get(
  "/getUserBillsDetailed",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const user = await User.findById(req.user._id);
      if (!user) return res.status(404).json({ msg: "User not found" });

      const bills = await Bill.find({ _id: { $in: user.bills } })
        .populate({
          path: "store",
          populate: {
            path: "company",
            model: "Company",
            select: "name pib",
          },
        })
        .populate("items.itemId");

      const transformedBills = bills.map((bill) => {
        const plainBill = bill.toObject();

        const transformedItems = plainBill.items.map((item) => {
          const itemData = item.itemId;
          if (!itemData) return item;

          const prices =
            itemData.prices?.sort(
              (a, b) =>
                Math.abs(new Date(plainBill.date) - new Date(a.date)) -
                Math.abs(new Date(plainBill.date) - new Date(b.date))
            ) || [];

          return {
            amount: item.amount,
            total: item.total,
            item: {
              id: itemData._id,
              name: itemData.name,
              price: prices[0]?.price,
            },
          };
        });

        return {
          ...plainBill,
          items: transformedItems,
        };
      });

      Response.json(res, {
        status: 200,
        message: "Bills found",
        response: transformedBills.reverse(),
      });
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
        .populate({
          path: "store",
          populate: {
            path: "company",
            model: "Company",
            select: "name pib",
          },
        })
        .populate("items.itemId");
      if (!bill) return res.status(404).json({ msg: "Bill not found" });

      const plainBill = bill.toObject();

      const transformedItems = plainBill.items.map((item) => {
        const itemData = item.itemId;
        if (!itemData) {
          console.log("No item data found for:", item);
          return item;
        }
        const prices =
          itemData.prices?.sort(
            (a, b) =>
              Math.abs(new Date(plainBill.date) - new Date(a.date)) -
              Math.abs(new Date(plainBill.date) - new Date(b.date))
          ) || [];
        return {
          amount: item.amount,
          total: item.total,
          item: {
            id: itemData._id,
            name: itemData.name,
            price: prices[0]?.price,
          },
        };
      });
      const response = {
        ...plainBill,
        items: transformedItems,
      };

      Response.json(res, {
        status: 200,
        message: "Bill found",
        response,
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

module.exports = router;
