require("dotenv").config();
const { envsafe, str } = require("envsafe");

const processEnv = envsafe({
  OVERRIDE_PHONE_NUMBER: str({
    allowEmpty: true,
    default: "",
  }),
});

module.exports = processEnv;
