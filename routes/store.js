const express = require("express");
const router = express.Router();
const Store = require("../models/Store");
const passport = require("passport");
const Response = require("../utils/responseHandler");

router.get(
  "/getUserStores",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
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
  }
);
module.exports = router;
