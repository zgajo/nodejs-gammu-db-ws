const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const { exec } = require("child_process");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const port = 3000;
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

function sendSMS(req, res) {
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

  const cmd = `gammu-smsd-inject TEXT ${number} -unicode -text "${message}"`;
  console.log(`Request to Send SMS: Call command:  "${cmd}"`);

  exec(cmd, function (error, stdout, stderr) {
    console.log("Request to Send SMS: Result: " + stdout);
    res.setHeader("Content-Type", "application/json");
    if (stdout.includes("OK") || stdout.includes("Created outbox message")) {
      res.status(200);
      console.log("Request to Send SMS: Done");
    } else {
      res.status(500);
      console.log("Request to Send SMS: FAILED", stderr, error);
    }

    res.json({ result: stdout, errormsg: stderr, errorout: error });
  });
}

// Routes
app.get("/", getRoot);
app.get("/networkinfo", getNetworkInfo);
app.post("/sendsms", sendSMS);

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
