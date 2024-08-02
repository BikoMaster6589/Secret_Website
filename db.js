import pg from "pg"
import env from "dotenv";
const { Client } = pg;
env.config();

// const db = new pg.Client({
//     user: process.env.DB_USER,
//     host: process.env.DB_HOST,
//     database: process.env.DATABASE,
//     password: process.env.DB_PASSWORD,
//     port: process.env.DB_POST,
//   });


  const dbConfig = {
    connectionString: process.env.DB_URL,
    ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false,
    keepAlive: true,
    schema : 'public',
    connectionTimeoutMillis: 30000,  // 30 seconds timeout for connection
    idle_in_transaction_session_timeout: 60000  // 60 seconds idle timeout
  };

  const db = new Client(dbConfig);

  db.connect()
  .then(() => console.log('Connected to the database'))
  .catch(err => {
     console.error('Database connection error:', err.stack);
     process.exit(1);
   });
 
  

export default db;