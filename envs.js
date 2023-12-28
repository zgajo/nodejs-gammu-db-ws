require("dotenv").config();
const { envsafe, str, url } = require("envsafe");

const processEnv = envsafe({
  OVERRIDE_PHONE_NUMBER: str({
    allowEmpty: true,
    default: "",
  }),
  PRIVATE_GATEWAY_KEY: str(),
  WS_HOST: url(),
  JWT_AUDIENCE: str(),
});

module.exports = processEnv;
