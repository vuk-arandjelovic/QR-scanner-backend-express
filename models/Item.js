const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ItemSchema = new Schema({
  name: { type: String, required: true },
  prices: [
    {
      date: { type: Date, required: true },
      price: { type: Number, required: true },
    },
  ],
});

module.exports = mongoose.model("Item", ItemSchema);
