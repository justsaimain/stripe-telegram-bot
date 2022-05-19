require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const axios = require("axios");
const { TOKEN, SERVER_URL, ADMIN_ID, DB_URI, MY_ID } = process.env;
const crypto = require("crypto");

const faker = require("faker");
const TokenModel = require("./models/Token");
const randomName = faker.name.findName();
const randomEmail = faker.internet.email();

const stripe = require("stripe")(
  "sk_test_51J1h3xDwRgMLu02uqNf3IdfZxiSuBzcKc9zdKFdVuGgnZuKPbIwZNLJlIf9H9wNM0inFwYgbxEdRZV1bBwFXrBuh00lBiROLdp"
);

const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;
const URI = `/webhook/${TOKEN}`;
const WEBHOOK_URL = SERVER_URL + URI;

const app = express();
app.use(bodyParser.json());

const init = async () => {
  const res = await axios.get(`${TELEGRAM_API}/setWebhook?url=${WEBHOOK_URL}`);
  console.log(res.data);
};

const deleteWebHook = async () => {
  const res = await axios.get(
    `${TELEGRAM_API}/deleteWebhook?url=${WEBHOOK_URL}`
  );
  console.log(res.data);
};

const createCardHolder = async () => {
  const cardholder = await stripe.issuing.cardholders.create({
    type: "individual",
    name: randomName,
    email: randomEmail,
    phone_number: "+18888675309",
    billing: {
      address: {
        line1: "1234 Main Street",
        city: "San Francisco",
        state: "CA",
        country: "GB",
        postal_code: "94111",
      },
    },
  });
  console.log(cardholder);
  return cardholder;
};

const createCard = async (cardholder) => {
  const card = await stripe.issuing.cards.create({
    cardholder,
    currency: "gbp",
    type: "virtual",
  });

  console.log(card);
  return card;
};

const createVCC = async (cardId) => {
  const card = await stripe.issuing.cards.retrieve(cardId, {
    expand: ["number", "cvc"],
  });

  console.log(card);

  return card;
};

const sendMessage = async (chat_id, text) => {
  await axios.post(`${TELEGRAM_API}/sendMessage`, {
    parse_mode: "html",
    chat_id,
    text,
  });
};

const checkAdmin = async (chatId) => {
  if (chatId === ADMIN_ID) {
    return true;
  }
  return false;
};

app.post(URI, async (req, res) => {
  const chatId = req.body.message.chat.id;
  const text = req.body.message.text;
  // console.log(req.body);
  // check its admin - 1733599636

  if (text === "/start") {
    sendMessage(chatId, "🤗 Hello! I am a bot for generation the VCC Card");
    res.send();
  }

  if (text.startsWith("/generate_token")) {
    if (checkAdmin(chatId)) {
      console.log(text);
      const splitText = text.split(" ");
      const command = splitText[0];
      const limit = splitText[1];
      const generateToken = crypto.randomBytes(48).toString("hex");
      TokenModel.save({
        body: generateToken,
        limit: limit,
      })
        .then((res) => {
          console.log(res);
          sendMessage(
            chatId,
            `✅ New Token Created\n\nToken:\n\n<code>${res.data.body}</code>\n\nLimit: ${res.data.limit}`
          );
        })
        .catch((err) => {
          sendMessage(chatId, "🚨 Cannot create token, something was wrong");
        });
    } else {
      sendMessage(chatId, "🚨 You have no permission to create token");
    }
  } else if (text.startsWith("/check_token")) {
    if (checkAdmin(chatId)) {
      console.log(text);
      const splitText = text.split(" ");
      const token = splitText[1];
      TokenModel.findOne({
        token: token,
      })
        .then((res) => {
          console.log(res);
          sendMessage(
            chatId,
            `✅ Token Infos\n\nToken:\n\n<code>${res.data.body}</code>\n\nLimit: ${res.data.limit}`
          );
        })
        .catch((err) => {
          sendMessage(chatId, "🚨 Cannot check token, something was wrong");
        });
    } else {
      sendMessage(chatId, "🚨 You have no permission to check token");
    }
  } else if (text.startsWith("/redeem_token")) {
    const splitText = text.split(" ");
    const token = splitText[1];
    const findToken = await TokenModel.findOne({ token: token });
    if (findToken) {
      const updateLimit = findToken.data.limit - 1;
      TokenModel.update({
        token: token,
        limit: updateLimit,
      })
        .then(async (res) => {
          if (res.data.limit > 0) {
            const cardHolder = await createCardHolder();
            const card = await createCard(cardHolder.id);
            const vccCard = await createVCC(card.id);
            sendMessage(
              chatId,
              `✅ Your VCC Card below\n\nCard Number\n<code>${vccCard.number}</code>\n\nExpiration\n<code>${vccCard.exp_month}/${vccCard.exp_year}</code>\n\nCVC\n<code>${vccCard.cvc}</code>\n\n🚀 Remaining limit for this token : ${updateLimit} Times`
            );
          } else {
            sendMessage(chatId, "limit reached");
          }
        })
        .catch((err) => {
          console.log(err);
          sendMessage(chatId, "🚨 Cannot redeem token, something was wrong");
        });
    } else {
      sendMessage(chatId, "🚨 Token not found");
    }
  }
  res.send();
});

app.listen(process.env.PORT || 5000, async () => {
  console.log("App is running on port " + process.env.PORT || 5000);
  // await deleteWebHook();
  await init();
  await mongoose
    .connect(DB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then((result) => {})
    .catch((e) => {});
});
