const express = require("express");
const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");

const router = express.Router();

router.get("/", async (req, res) => {
  // All your preview logic remains the same as in your current `/preview` route
  // Replace all `__dirname` with `path.join(__dirname, '..')` where needed
  // ...

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
    .replace("{{operator}}", operator || "Update")
    .replace("{{acReg}}", acReg || "Update")
    .replace("{{typeOfAC}}", typeOfAC || "Update")
    .replace("{{dateOfDumping}}", dateOfDumping || "Update")
    .replace("{{dataReceivedFrom}}", dataReceivedFrom || "Update")
    .replace("{{fdrPnSn}}", fdrPnSn || "Update")
    .replace("{{dateOfFlight}}", dateOfFlight || "Update")
    .replace("{{flightSector}}", flightSector || "Update")
    .replace("{{natureOfReadout}}", natureOfReadout || "Update")
    .replace("{{lflRefNo}}", lflRefNo || "Update")
    .replace("{{noOfParametersRecorded}}", noOfParametersRecorded || "Update")
    .replace(
      "{{noOfParametersSubmitted}}",
      noOfParametersSubmitted || "Update"
    );

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
  const safeValue = (val) =>
    val === undefined || val === null || val.toString().trim() === ""
      ? "Update"
      : val;

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
  function cleanAndFilterAndFormatKeys(keys) {
    const regex =
      /(_%|_mV|_Kts|_Ft|_\.\.|_\.{3}Year|_\.{3}|_.._Year|_DegC|_Deg\ C|_DecC|_lb|_Psi|_Deg|_g|_MHz|_NM|_mb)$/;
    return keys.map((str) => str.replace(regex, "").replace(/_/g, " "));
  }

  // Helper: Classify field types for each row of data
  function classifyFieldTypes(data) {
    const result = {};
    const dataArray = Array.isArray(data) ? data : [data];
    const allKeys = [...new Set(dataArray.flatMap((obj) => Object.keys(obj)))];

    const timeRegex = /^\d{2}:\d{2}:\d{2}$/;
    const discreteRegex = /^[\w\s+\-/().:%]+$/;
    const onlyDashesRegex = /^-+$/;
    const onlyDotsRegex = /^\.+$/;

    for (const key of allKeys) {
      let hasMeaningfulValue = false;
      let hasVariableValue = false;
      let isAllDiscrete = true;

      for (const row of dataArray) {
        const value = row[key];
        if (value === undefined || value === null) continue;

        const cleanedValue = value.toString().trim();
        if (cleanedValue === "") continue;

        const isValidNumber = !isNaN(cleanedValue);
        const isTimeFormat = timeRegex.test(cleanedValue);
        const isOnlyDashes =
          onlyDashesRegex.test(cleanedValue) && cleanedValue.length < 10;
        const isOnlyDots =
          onlyDotsRegex.test(cleanedValue) && cleanedValue.length < 10;

        if (
          cleanedValue !== "---" &&
          cleanedValue !== "......." &&
          cleanedValue !== ""
        ) {
          hasMeaningfulValue = true;
        }

        if (isValidNumber || isTimeFormat) {
          hasVariableValue = true;
        }

        const isDiscreteCandidate =
          isOnlyDashes ||
          isOnlyDots ||
          cleanedValue === "---" ||
          cleanedValue === "......." ||
          discreteRegex.test(cleanedValue);

        if (!isDiscreteCandidate) {
          isAllDiscrete = false;
        }
      }

      if (!hasMeaningfulValue) {
        result[key] = "Update";
      } else if (hasVariableValue) {
        result[key] = "Variable";
      } else if (isAllDiscrete) {
        result[key] = "Discrete";
      } else {
        result[key] = "Update";
      }
    }

    return result;
  }

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
