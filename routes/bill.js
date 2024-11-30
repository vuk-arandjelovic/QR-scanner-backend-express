const express = require("express");
const router = express.Router();
const Bill = require("../models/Bill");
const User = require("../models/User");
const passport = require("passport");
const Response = require("../utils/responseHandler");
const authMiddleware = require("../middleware/auth-wrapper");

router.get("/getUserBills", authMiddleware, async (req, res) => {
  try {
    const bills = await Bill.find({ _id: { $in: req.user.bills } });
    return Response.json(res, {
      message: "Bills found",
      response: bills,
    });
  } catch (err) {
    console.error(err);
    return Response.json(res, {
      status: 500,
      message: "Server error",
    });
  }
});
router.get("/getUserBillsDetailed", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user)
      return Response.json(res, {
        status: 404,
        message: "User not found",
      });

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

    return Response.json(res, {
      message: "Bills found",
      response: transformedBills.reverse(),
    });
  } catch (err) {
    console.error(err);
    return Response.json(res, {
      status: 500,
      message: "Server error",
    });
  }
});
// Get a single bill by ID
router.get("/:id", authMiddleware, async (req, res) => {
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
    if (!bill)
      return Response.json(res, {
        status: 404,
        message: "Bill not found",
      });

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

    return Response.json(res, {
      message: "Bill found",
      response,
    });
  } catch (err) {
    console.error(err.message);
    return Response.json(res, {
      status: 500,
      message: "Server error",
    });
  }
});

module.exports = router;
