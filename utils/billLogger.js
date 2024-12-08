const fs = require("fs").promises;
const path = require("path");

const logBillData = async (rawData, parsedData) => {
  try {
    const logPath = path.join(__dirname, "../logs/bills.json");

    // Create logs directory if it doesn't exist
    try {
      await fs.access(path.dirname(logPath));
    } catch {
      await fs.mkdir(path.dirname(logPath));
    }

    // Read existing logs or start with empty array
    let logs = [];
    try {
      const existingData = await fs.readFile(logPath, "utf8");
      logs = JSON.parse(existingData);
    } catch (error) {
      // File doesn't exist or is empty, continue with empty array
    }

    // Add new log entry
    logs.push({
      timestamp: new Date().toISOString(),
      rawData,
      parsedData,
    });

    // Write back to file
    await fs.writeFile(logPath, JSON.stringify(logs, null, 2));
    console.log("Bill data logged successfully");
  } catch (error) {
    console.error("Error logging bill data:", error);
  }
};

module.exports = { logBillData };
