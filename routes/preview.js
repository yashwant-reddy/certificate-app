const express = require("express");
const fs = require("fs");
const path = require("path");

const {
  cleanAndFilterAndFormatKeys,
  classifyFieldTypes,
  safeValue,
} = require("../utils/helpers");

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");

const router = express.Router();
require("dotenv").config();

// Create DynamoDB client (v3)
const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
const dynamoDB = DynamoDBDocumentClient.from(client);

router.get("/", async (req, res) => {
  // 1. Increment the counter in DynamoDB and get updated count
  const timestamp = new Date().toISOString();
  const params = {
    TableName: process.env.DYNAMO_TABLE,
    Key: { id: "mainCounter" },
    UpdateExpression: `
      SET #count = if_not_exists(#count, :zero) + :incr,
          #ts = :ts
    `,
    ExpressionAttributeNames: {
      "#count": "count",
      "#ts": "timestamp", // Alias 'timestamp' too
    },
    ExpressionAttributeValues: {
      ":zero": 0,
      ":incr": 1,
      ":ts": timestamp,
    },
    ReturnValues: "ALL_NEW",
  };

  let counterValue;
  try {
    const updateResult = await dynamoDB.send(new UpdateCommand(params));
    counterValue = updateResult.Attributes.count;
    console.log("DynamoDB counter incremented to:", counterValue);
  } catch (err) {
    console.error("Error incrementing DynamoDB counter:", err);
    return res.status(500).send("Failed to increment preview counter.");
  }

  // Handle images - Define paths to image files
  const signature1Path = path.join(
    __dirname,
    "..",
    "public",
    "images",
    "sasi-signature.png"
  );
  const signature2Path = path.join(
    __dirname,
    "..",
    "public",
    "images",
    "achhuth-signature.png"
  );
  const logoPath = path.join(
    __dirname,
    "..",
    "public",
    "images",
    "nestlogo.svg"
  );

  console.log("Image paths:");
  console.log("Signature1:", signature1Path);
  console.log("Signature2:", signature2Path);
  console.log("Logo:", logoPath);

  // Check if files exist
  console.log("File existence check:");
  console.log("Signature1 exists:", fs.existsSync(signature1Path));
  console.log("Signature2 exists:", fs.existsSync(signature2Path));
  console.log("Logo exists:", fs.existsSync(logoPath));

  let signature1URI = "";
  let signature2URI = "";
  let logoURI = "";

  try {
    // Read and encode images
    if (fs.existsSync(signature1Path)) {
      const signature1Base64 = fs.readFileSync(signature1Path, "base64");
      signature1URI = `data:image/png;base64,${signature1Base64}`;
      console.log("Signature1 loaded successfully");
    } else {
      console.log("Signature1 file not found");
    }

    if (fs.existsSync(signature2Path)) {
      const signature2Base64 = fs.readFileSync(signature2Path, "base64");
      signature2URI = `data:image/png;base64,${signature2Base64}`;
      console.log("Signature2 loaded successfully");
    } else {
      console.log("Signature2 file not found");
    }

    if (fs.existsSync(logoPath)) {
      const logoBase64 = fs.readFileSync(logoPath, "base64");
      logoURI = `data:image/svg+xml;base64,${logoBase64}`;
      console.log("Logo loaded successfully");
    } else {
      console.log("Logo file not found");
    }
  } catch (err) {
    console.error("Error reading image files:", err);
    // Continue without images if they can't be read
  }

  const date = new Date();
  const currentYear = date.getFullYear();

  const formattedDate = date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  console.log(formattedDate);
  // Assuming you already have counterValue from DynamoDB or elsewhere

  const certificateRefNo = `${counterValue}/${currentYear}`;

  const {
    workOrderNo,
    operator,
    acReg,
    typeOfAC,
    dateOfDumping,
    dataReceivedFrom,
    fdrPnSn,
    dateOfFlight,
    flightSector,
    natureOfReadout,
    lflRefNo,
    noOfParametersRecorded,
    noOfParametersSubmitted,
  } = req.query;

  const templatePath = path.join(__dirname, "..", "templates", "template.html");

  const aircraftJsonUrl =
    "https://csv-json-pipeline-01.s3.ap-south-1.amazonaws.com/data/Operator+Info.json";

  // Read template first
  let html = fs.readFileSync(templatePath, "utf-8");

  // Inject query params placeholders
  html = html
    .replace("{{workOrderNo}}", workOrderNo || "Update")
    .replace(/{{operator}}/g, operator || "Update")
    .replace(/{{acReg}}/g, acReg || "Update")
    .replace(/{{typeOfAC}}/g, typeOfAC || "Update")
    .replace("{{dateOfDumping}}", dateOfDumping || "Update")
    .replace("{{dataReceivedFrom}}", dataReceivedFrom || "Update")
    .replace("{{fdrPnSn}}", fdrPnSn || "Update")
    .replace("{{dateOfFlight}}", dateOfFlight || "Update")
    .replace("{{flightSector}}", flightSector || "Update")
    .replace("{{natureOfReadout}}", natureOfReadout || "Update")
    .replace("{{lflRefNo}}", lflRefNo || "Update")
    .replace("{{noOfParametersRecorded}}", noOfParametersRecorded || "Update")
    .replace("{{noOfParametersSubmitted}}", noOfParametersSubmitted || "Update")
    .replace("{{certificateRefNo}}", certificateRefNo || "Update") // Inject counter here
    .replace("{{currentDate}}", formattedDate || "Update")
    .replace("{{signature1}}", signature1URI)
    .replace("{{signature2}}", signature2URI)
    .replace("{{logo}}", logoURI);

  // Fetch aircraft data from S3 JSON
  let acRegDropdownData;
  try {
    const response = await fetch(aircraftJsonUrl);
    if (!response.ok) throw new Error("Failed to fetch aircraft data from S3");
    acRegDropdownData = await response.json();
  } catch (err) {
    console.error("Error fetching aircraft data:", err);
    return res.status(500).send("Error fetching aircraft data");
  }

  const acRegKey = acReg;
  const record = acRegDropdownData[acRegKey];
  if (!record) {
    return res.status(404).json({
      error: `No record found for Aircraft Reg: ${acRegKey}`,
    });
  }

  // Utility function to safely return value or fallback

  const partNumber = safeValue(record["Part Number"]);
  const serialNumber = safeValue(record["Serial Number"]);
  const noOfParams = safeValue(
    record["No of Parameter submitted for Evaluation"]
  );

  html = html
    .replace("{{partNumber}}", partNumber)
    .replace("{{serialNumber}}", serialNumber)
    .replace("{{noOfParams}}", noOfParams)
    .replace("{{description}}", `${partNumber} / ${serialNumber}`);

  // Read manifest.json to get uploaded report numbers
  let ReportSequenceArray = [];
  try {
    const manifestPath = path.join(__dirname, "..", "uploads", "manifest.json");
    ReportSequenceArray = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    console.log("Reports to show:", ReportSequenceArray);
  } catch (err) {
    console.error("Error reading manifest.json:", err);
  }

  // Helper: Clean and format keys (remove units, underscores)

  // Helper: Classify field types for each row of data

  // Generate dynamic readout report tables
  let dynamicReadoutTables = "";
  let sNumber = 1;

  for (const i of ReportSequenceArray) {
    const jsonPath = path.join(
      __dirname,
      "..",
      "uploads",
      `Readout Report ${i}.json`
    );
    if (!fs.existsSync(jsonPath)) continue;

    const reportData = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
    const report = reportData.find((f) => f.file === `Readout Report ${i}.csv`);
    const content = report?.[`Readout Report ${i} Content`] || [];

    if (content.length === 0) continue;

    const rawKeys = Object.keys(content[0]);
    const cleanedKeys = cleanAndFilterAndFormatKeys(rawKeys);

    const rowWiseFieldTypes = content.map((row, idx) => ({
      rowIndex: idx,
      fieldTypes: classifyFieldTypes(row),
    }));

    const fieldTypeCounts = {};
    for (const row of rowWiseFieldTypes) {
      for (const [key, type] of Object.entries(row.fieldTypes)) {
        if (!fieldTypeCounts[key]) {
          fieldTypeCounts[key] = { Variable: 0, Discrete: 0, Update: 0 };
        }
        fieldTypeCounts[key][type]++;
      }
    }

    const overallFieldTypes = {};
    for (const [key, counts] of Object.entries(fieldTypeCounts)) {
      overallFieldTypes[key] = {
        type:
          counts.Variable > 0
            ? "Variable"
            : counts.Discrete > 0
            ? "Discrete"
            : "Update",
        count: counts,
      };
    }

    // Save fieldTypes JSON for debugging if you want (optional)
    const fieldTypesPath = path.join(
      __dirname,
      "..",
      "uploads",
      `fieldTypes_report${i}.json`
    );
    fs.writeFileSync(
      fieldTypesPath,
      JSON.stringify({ overallFieldTypes }, null, 2),
      "utf-8"
    );

    const tableRows = rawKeys
      .map((rawKey, index) => {
        const cleanedKey = cleanedKeys[index];
        const paramInfo = overallFieldTypes[rawKey] || {};
        const parameterType = paramInfo.type || "";

        const values = content.map((row) => row[rawKey]);
        const uniqueValues = [...new Set(values.map((v) => JSON.stringify(v)))];
        const isAllSame = uniqueValues.length === 1;
        const remark = isAllSame
          ? `Always "${JSON.parse(uniqueValues[0])}"`
          : "";

        return `
        <tr>
          <td>${sNumber++}</td>
          <td contenteditable="true">${cleanedKey}</td>
          <td contenteditable="true">${parameterType}</td>
          <td contenteditable="true">${isAllSame ? "" : "✔"}</td>
          <td contenteditable="true">${isAllSame ? "✔" : ""}</td>
          <td contenteditable="true"></td>
          <td contenteditable="true"></td>
          <td contenteditable="true">${remark}</td>
        </tr>
      `;
      })
      .join("");

    dynamicReadoutTables += `
      <tr>
        <td colspan="8" class="readout-header">Readout Report ${i}</td>
      </tr>
      ${tableRows}
    `;
  }

  html = html.replace("{{dynamicReadoutTables}}", dynamicReadoutTables);

  res.send(html);
});

module.exports = router;
