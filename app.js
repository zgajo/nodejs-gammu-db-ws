// Import modules
const express = require("express");
const mysql = require("mysql");
const request = require("request");

// Create app
const app = express();

// Create database connection
const db = mysql.createConnection({
  host: "mariadb",
  user: "smsd",
  password: "smsd", // change this to your user password
  database: "smsd",
});

// Connect to database
db.connect((err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log("Connected to database");
});

// Define routes
app.get("/", (req, res) => {
  res.send(
    "Hello, this is a nodejs application that will send and read sms messages using gammu"
  );
});

app.get("/send", (req, res) => {
  // Get query parameters
  const number = req.query.number;
  const text = req.query.text;

  // Validate parameters
  if (!number || !text) {
    res.status(400).send("Missing number or text");
    return;
  }

  // Create options for API request
  const options = {
    url: "http://api:5000/sms", // change this to your API url
    method: "POST",
    json: true,
    headers: {
      Authorization: "Basic YWRtaW46cGFzc3dvcmQ=", // change this to your base64 encoded credentials
    },
    body: {
      number: number,
      text: text,
    },
  };

  // Make API request
  request(options, (err, response, body) => {
    if (err) {
      console.error(err);
      res.status(500).send("Error sending SMS");
      return;
    }
    if (response.statusCode !== 200) {
      console.error(body);
      res.status(response.statusCode).send("Error sending SMS");
      return;
    }
    console.log(body);
    res.send("SMS sent successfully");
  });
});

app.get("/read", (req, res) => {
  // Get query parameter
  const id = req.query.id;

  // Validate parameter
  if (!id) {
    res.status(400).send("Missing id");
    return;
  }

  // Create query for database
  const query = "SELECT * FROM inbox WHERE ID = ?";

  // Execute query
  db.query(query, [id], (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).send("Error reading SMS");
      return;
    }
    if (results.length === 0) {
      res.status(404).send("SMS not found");
      return;
    }
    console.log(results[0]);
    res.send(results[0]);
  });
});

// Start server
const port = 3000; // change this to your desired port
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
