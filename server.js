const processEnv = require("./envs");
const WebSocket = require("isomorphic-ws");
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const { exec } = require("child_process");
const jwt = require("jsonwebtoken");

const logger = require("pino")({ level: processEnv.LOG_LEVEL });

const connect = function () {
  const token = jwt.sign({}, processEnv.PRIVATE_GATEWAY_KEY, {
    expiresIn: "10m",
    algorithm: "RS256",
    audience: processEnv.JWT_AUDIENCE,
  });

  const ws = new WebSocket(processEnv.WS_HOST, {
    headers: {
      Authorization: token,
    },
  });

  ws.on("message", function incoming(data, isBinary) {
    const message = isBinary ? data : data.toString();
    const parsedMessage = JSON.parse(message);

    sendSms(parsedMessage.number, parsedMessage.message);
  });

  ws.on("open", function open(socket) {
    logger.debug("connected");
    setInterval(() => {
      ws.ping();
    }, 30000);
  });

  ws.on("error", function (err) {
    logger.warn("socket error", err);
  });

  ws.on("close", function () {
    logger.info("socket close");
    setTimeout(connect, 10000);
  });
};
connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const port = 3001;
const appVersion = "SMSRestAPI Version 005";

// Route handlers
function getRoot(req, res) {
  res.json({ message: "MindFabrik ChatSMS API" });
}

function getNetworkInfo(req, res) {
  const cmd = "gammu -c /etc/gammurc networkinfo";
  logger.debug("Requesting Network Information...");

  exec(cmd, function (error, stdout, stderr) {
    logger.debug("Requesting Network Information: Done");
    logger.debug("stdout", stdout);
    res.setHeader("Content-Type", "application/json");
    res.json({ result: stdout, errormsg: stderr, errorout: error });
  });
}

function sendSms(phone, message) {
  if (!phone) {
    logger.info(
      "ERROR: Request to Send SMS received: Phone number is not defined. Exit."
    );
    throw new Error({ error: "Phone number is not defined" });
  }

  if (!message) {
    logger.info(
      "ERROR: Request to Send SMS received: Message is not defined. Exit."
    );
    throw new Error({ error: "Message is not defined" });
  }

  const cmd = `sudo gammu-smsd-inject TEXT ${
    processEnv.OVERRIDE_PHONE_NUMBER || phone
  } -unicode -text "${message}" -len 400`;
  logger.info(`Request to Send SMS: Call command:  "${cmd}"`);

  exec(cmd, function (error, stdout, stderr) {
    logger.debug("Request to Send SMS: Result: " + stdout);
    if (
      stdout.includes("OK") ||
      stdout.includes("Created outbox message") ||
      stdout.includes("Written message with ID")
    ) {
      logger.debug("Request to Send SMS: Done");
      return true;
    } else {
      logger.error("Request to Send SMS: FAILED", stderr, error);
      throw new Error({ error: stderr, errorout: error });
    }
  });
}

function sendSMSRequest(req, res) {
  logger.debug("Request to Send SMS received...");
  const { number, message } = req.body;

  if (!number) {
    res.status(400).json({ error: "Number is not defined" });
    logger.debug(
      "ERROR: Request to Send SMS received: Number is not defined. Exit."
    );
    return;
  }

  if (!message) {
    res.status(400).json({ error: "Message is not defined" });
    logger.debug(
      "ERROR: Request to Send SMS received: Message is not defined. Exit."
    );
    return;
  }

  return sendSms(number, message)
    .then(() => res.status(200))
    .catch((error) => {
      res.status(500).json({ error });
    });
}

// Routes
app.get("/", getRoot);
app.get("/networkinfo", getNetworkInfo);
app.post("/sendsms", sendSMSRequest);

// Start server
app.listen(port, () => {
  logger.debug(
    "--------------------------------------------------------------------"
  );
  logger.debug(appVersion);
  logger.debug(
    "--------------------------------------------------------------------"
  );
  logger.debug("MindFabrik ChatSMS API Server is running on port " + port);
});
