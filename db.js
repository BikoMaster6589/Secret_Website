import pg from "pg"
import env from "dotenv";
const { Client } = pg;
env.config();

const db = new Client({
  connectionString: process.env.DB_URL,
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_POST,
  ssl: {
    rejectUnauthorized: false // Set to true if you want to reject self-signed certificates
  }
});

db.connect();
  

export default db;