const mongoose = require("mongoose");

const tokenSchema = new mongoose.Schema({
  body: {
    type: String,
  },
  limit: {
    type: String,
  },
});

const Token = mongoose.model("token", tokenSchema);

module.exports = Token;
