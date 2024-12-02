const express = require("express");
const router = express.Router();
const Guarantee = require("../models/Guarantee");
const Response = require("../utils/responseHandler");
const authMiddleware = require("../middleware/auth-wrapper");

router.get("/getUserGuarantees", authMiddleware, async (req, res) => {
  try {
    const guarantees = await Guarantee.find({ user: req.user.id }).populate({
      path: "bill",
      model: "Bill",
      populate: {
        path: "store",
        model: "Store",
      },
    });
    return Response.json(res, {
      message: "Guarantees found",
      response: guarantees,
    });
  } catch (err) {
    console.error(err);
    return Response.json(res, {
      status: 500,
      message: "Server error",
    });
  }
});
// Get a single guarantee by ID
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const guarantee = await Guarantee.findById(req.params.id).populate("bill");
    if (!guarantee)
      return Response.json(res, {
        status: 404,
        message: "Guarantee not found",
      });
    return Response.json(res, {
      message: "Guarantee found",
      response: guarantee,
    });
  } catch (err) {
    console.error(err.message);
    return Response.json(res, {
      status: 500,
      message: "Server error",
    });
  }
});
// Create a new guarantee
router.post("/", authMiddleware, async (req, res) => {
  const { user, bill, item, name, expiration } = req.body;
  try {
    const newGuarantee = new Guarantee({
      user,
      bill,
      item,
      name,
      expiration,
    });
    const guarantee = await newGuarantee.save();
    return Response.json(res, {
      message: "Guarantee created",
      response: guarantee,
    });
  } catch (err) {
    console.error(err.message);
    return Response.json(res, {
      status: 500,
      message: "Server error",
    });
  }
});

// Update a guarantee by ID
router.put("/:id", authMiddleware, async (req, res) => {
  const { user, bill, item, name, expiration } = req.body;
  try {
    const guarantee = await Guarantee.findByIdAndUpdate(
      req.params.id,
      { user, bill, item, name, expiration },
      { new: true }
    );
    if (!guarantee)
      return Response.json(res, {
        status: 404,
        message: "Guarantee not found",
      });
    return Response.json(res, {
      message: "Guarantee updated",
      response: guarantee,
    });
  } catch (err) {
    console.error(err.message);
    return Response.json(res, {
      status: 500,
      message: "Server error",
    });
  }
});

// Delete a guarantee by ID
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const guarantee = await Guarantee.findByIdAndDelete(req.params.id);
    if (!guarantee)
      return Response.json(res, {
        status: 404,
        message: "Guarantee not found",
      });
    return Response.json(res, {
      message: "Guarantee deleted",
    });
  } catch (err) {
    console.error(err.message);
    return Response.json(res, {
      status: 500,
      message: "Server error",
    });
  }
});

// Get all guarantees
router.get("/", authMiddleware, async (req, res) => {
  try {
    const guarantees = await Guarantee.find().populate("bill");
    return Response.json(res, {
      message: "Guarantees found",
      response: guarantees,
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
