require("dotenv").config();

const logger = (req, res, next) => {
  if (process.env.DEVELOPMENT === "true") {
    const now = new Date();
    console.log(`[${now.toISOString()}] ${req.method} ${req.url}`);
    console.log(req.body);
  }
  next();
};

module.exports = logger;
