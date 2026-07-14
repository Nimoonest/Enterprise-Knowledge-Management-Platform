const mysql = require("mysql2/promise");
const path = require("path");
const { loadEnvFile } = require("../env-loader");

loadEnvFile(path.join(__dirname, "..", ".env"));

async function main() {
  const host = process.env.DOCUMENT_MYSQL_HOST || "127.0.0.1";
  const port = Number(process.env.DOCUMENT_MYSQL_PORT || 3307);
  const rootUser = process.env.DOCUMENT_MYSQL_ROOT_USER || "root";
  const rootPassword = process.env.DOCUMENT_MYSQL_ROOT_PASSWORD || "";
  const database = process.env.DOCUMENT_MYSQL_DATABASE || "ekmp";
  const appUser = process.env.DOCUMENT_MYSQL_USER || "ekmp";
  const appPassword = process.env.DOCUMENT_MYSQL_PASSWORD || "";
  if (!appPassword) throw new Error("DOCUMENT_MYSQL_PASSWORD is required");
  if (!/^[a-zA-Z0-9_]+$/.test(database) || !/^[a-zA-Z0-9_]+$/.test(appUser)) throw new Error("database and user names must be alphanumeric identifiers");

  const connection = await mysql.createConnection({ host, port, user: rootUser, password: rootPassword, multipleStatements: true });
  const account = `'${appUser}'@'%'`;
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`);
  await connection.query(`CREATE USER IF NOT EXISTS ${account} IDENTIFIED BY ?`, [appPassword]);
  await connection.query(`ALTER USER ${account} IDENTIFIED BY ?`, [appPassword]);
  await connection.query(`GRANT ALL PRIVILEGES ON \`${database}\`.* TO ${account}`);
  await connection.query("FLUSH PRIVILEGES");
  await connection.end();
  console.log(JSON.stringify({ status: "ready", host, port, database, user: appUser }));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
