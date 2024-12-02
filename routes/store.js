const express = require("express");
const router = express.Router();
const Store = require("../models/Store");
const Response = require("../utils/responseHandler");
const authMiddleware = require("../middleware/auth-wrapper");

router.get("/getUserStores", authMiddleware, async (req, res) => {
  try {
    const stores = await Store.find({
      _id: { $in: req.user.stores_visited },
    }).populate("company");
    return Response.json(res, {
      message: "Stores found",
      response: stores,
    });
  } catch (err) {
    console.error(err);
    return Response.json(res, {
      status: 500,
      message: "Server error",
    });
  }
});
module.exports = router;
