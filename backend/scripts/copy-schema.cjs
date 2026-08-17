const fs = require("fs");
const path = require("path");

const source = path.join(__dirname, "..", "src", "database", "schema.sql");
const destinationDir = path.join(__dirname, "..", "dist", "database");
const destination = path.join(destinationDir, "schema.sql");

fs.mkdirSync(destinationDir, { recursive: true });
fs.copyFileSync(source, destination);

console.log("schema.sql copied successfully to dist/database/");