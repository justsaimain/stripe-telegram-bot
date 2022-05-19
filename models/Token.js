const Token = require("./schemas/Token");

module.exports.getList = async () => {
  const tokens = Token.find().sort({
    _id: -1,
  });
  return tokens;
};

module.exports.save = async (params = {}) => {
  let rData = {};
  const { body, limit } = params;
  rData = await Token.create({
    body,
    limit,
  });

  return { status: "Success", data: rData };
};

module.exports.update = async (params = {}) => {
  let rData = {};
  const { token, limit } = params;

  rData = await Token.findOneAndUpdate({ body: token }, { limit: limit });

  return { status: "Success", data: rData };
};

module.exports.findOne = async (params = {}) => {
  const { token } = params;
  let rData = {};
  rData = await Token.findOne({ body: token });
  return { status: "Success", data: rData };
};
