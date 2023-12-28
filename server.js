const processEnv = require("./envs");
const WebSocket = require("isomorphic-ws");
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const { exec } = require("child_process");
const jwt = require("jsonwebtoken");

const connect = function () {
  const token = jwt.sign({}, processEnv.PRIVATE_GATEWAY_KEY, {
    expiresIn: "1m",
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

  ws.on("open", function open() {
    console.log("connected");
  });

  ws.on("error", function (err) {
    console.log("socket error", err);
  });

  ws.on("close", function () {
    console.log("socket close");
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
  console.log("Requesting Network Information...");

  exec(cmd, function (error, stdout, stderr) {
    console.log("Requesting Network Information: Done");
    console.log("stdout", stdout);
    res.setHeader("Content-Type", "application/json");
    res.json({ result: stdout, errormsg: stderr, errorout: error });
  });
}

function sendSms(phone, message) {
  if (!phone) {
    console.log(
      "ERROR: Request to Send SMS received: Phone number is not defined. Exit."
    );
    throw new Error({ error: "Phone number is not defined" });
  }

  if (!message) {
    console.log(
      "ERROR: Request to Send SMS received: Message is not defined. Exit."
    );
    throw new Error({ error: "Message is not defined" });
  }

  const cmd = `sudo gammu-smsd-inject TEXT ${
    processEnv.OVERRIDE_PHONE_NUMBER || phone
  } -unicode -text "${message}"`;
  console.log(`Request to Send SMS: Call command:  "${cmd}"`);

  exec(cmd, function (error, stdout, stderr) {
    console.log("Request to Send SMS: Result: " + stdout);
    if (
      stdout.includes("OK") ||
      stdout.includes("Created outbox message") ||
      stdout.includes("Written message with ID")
    ) {
      console.log("Request to Send SMS: Done");
      return true;
    } else {
      console.log("Request to Send SMS: FAILED", stderr, error);
      throw new Error({ error: stderr, errorout: error });
    }
  });
}

function sendSMSRequest(req, res) {
  console.log("Request to Send SMS received...");
  const { number, message } = req.body;

  if (!number) {
    res.status(400).json({ error: "Number is not defined" });
    console.log(
      "ERROR: Request to Send SMS received: Number is not defined. Exit."
    );
    return;
  }

  if (!message) {
    res.status(400).json({ error: "Message is not defined" });
    console.log(
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
  console.log(
    "--------------------------------------------------------------------"
  );
  console.log(appVersion);
  console.log(
    "--------------------------------------------------------------------"
  );
  console.log("MindFabrik ChatSMS API Server is running on port " + port);
});
