const passport = require("passport");
const Response = require("../utils/responseHandler");

const authMiddleware = (req, res, next) => {
  passport.authenticate("jwt", { session: false }, (err, user, info) => {
    if (err) {
      return Response.json(res, {
        status: 500,
        message: "Authentication error",
      });
    }
    if (!user) {
      return Response.json(res, {
        status: 401,
        message: "Session expired",
      });
    }
    req.user = user;
    next();
  })(req, res, next);
};

module.exports = authMiddleware;
