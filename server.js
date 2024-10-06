const express = require("express");
const connectDB = require("./config/db");
const passport = require("passport");
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const companyRoutes = require("./routes/company");
const storeRoutes = require("./routes/store");
const billRoutes = require("./routes/bill");
const guaranteeRoutes = require("./routes/guarantee");
const itemRoutes = require("./routes/item");
const scrapeRoutes = require("./routes/scrape");
const logger = require("./middleware/logger");
require("dotenv").config();
const app = express();

// Connect Database
connectDB();

// Init Middleware
app.use(express.json());

// Use logger middleware
app.use(logger);

// Passport middleware
app.use(passport.initialize());
require("./config/passport")(passport);

// Define Routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/stores", storeRoutes);
app.use("/api/bills", billRoutes);
app.use("/api/guarantees", guaranteeRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/scrape", scrapeRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
