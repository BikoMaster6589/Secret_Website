import pg from "pg"
import env from "dotenv";
env.config();

const db = new pg.Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_POST,
  });

db.connect();
  

export default db;