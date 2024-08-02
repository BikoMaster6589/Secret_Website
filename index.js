import express from "express";
import bodyParser from "body-parser";
import ejs from "ejs";
import env from "dotenv";
import bcrypt from "bcrypt";
import session from "express-session";
import passport from "passport";
import { Strategy } from "passport-local";
import GoogleStrategy from "passport-google-oauth2";
import connectPGSimple from 'connect-pg-simple';


const saltRound = 10;
const app = express();
const PgSession = connectPGSimple(session);

env.config();

// Connecting Database

import db from "./db.js";

// MiddleWare

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  session({
    store: new PgSession({
      db: db, // Connection pool
      tableName: 'session', // Table name to store session data
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.get("/", (req, res) => {
  res.render("index.ejs");
});

app.get("/signup", (req, res) => {
  res.render("signup.ejs");
});
app.get("/signin", (req, res) => {
  res.render("signin.ejs");
});



app.get("/edit", (req, res) => {
  if (req.isAuthenticated()) { // Changed to call as a function
    res.render("edit.ejs");
  } else {
    res.redirect("/signin"); // Corrected typo
  }
});

app.get("/feedback", (req, res) => {
  if (req.isAuthenticated()){
  res.render("feedback.ejs");
}  else{
  res.redirect("/signin");
}
 
});
app.get("/Ip", (req, res) => {
  res.render("Incorrect_Pass.ejs");
});


app.get("/logout", (req, res) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

app.get("/secrets", async (req, res) => {
  if (req.isAuthenticated()) { // Changed to call as a function
    try {
      const result = await db.query(
        `SELECT secrets FROM users WHERE email = $1`,
        [req.user.email]
      );
      const sc = result.rows[0].secrets; // Ensure field name matches database schema
      res.render("main.ejs", {
        content: sc,
      });
    } catch (err) {
      console.log(err);
    }
  } else {
    res.redirect("/signin");
  }
});

app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

app.get(
  "/auth/google/secrets",
  passport.authenticate("google", {
    successRedirect: "/secrets",
    failureRedirect: "/secrets",
  })
);

// Registering

app.post("/register", async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  try {
    const alreadyEmail = await db.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (alreadyEmail.rows.length > 0) {
      res.send("Email Already Exists");
    } else {
      bcrypt.hash(password, saltRound, async (err, hash) => {
        if (err) {
          res.send("Server Error");
        } else {
          const result = await db.query(
            "INSERT INTO users (email,password) VALUES ($1,$2) RETURNING *",
            [email, hash]
          );
          const user = result.rows[0];
          req.login(user, (err) => {
            if (err) {
              console.error("Error during login:", err);
              res.send("Login Error");
            } else {
              console.log("Success");
              res.redirect("/secrets");
            }
          });
        }
      });
    }
  } catch (err) {
    console.log(err);
  }
});

// Login

app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/secrets",
    failureRedirect: "/Ip",
  })
);

// Submit route

app.post("/edit", async function (req, res) {
  const Secrets = req.body.contentname;
  console.log(Secrets);
  console.log(req.user);

  try {
    await db.query("UPDATE users SET secrets = $1 WHERE email = $2", [
      Secrets,
      req.user.email,
    ]);
    res.redirect("/secrets");
  } catch (err) {
    console.log(err);
  }
});



app.post("/feed", async function(req,res){
  const feed = req.body.feed;


  try{
    await db.query("UPDATE users SET feedback =$1 WHERE email = $2", [
      feed,
      req.user.email,
    ]);
    res.redirect("/secrets")
  } catch (err) {
    console.log(err);
  }
});

// Strategy

passport.use(
  "local",
  new Strategy(async function verify(username, password, cb) {
    try {
      const result = await db.query("SELECT * FROM users WHERE email = $1", [
        username,
      ]);
      if (result.rows.length > 0) {
        const user = result.rows[0];
        const storedHashedPassword = user.password;

        bcrypt.compare(password, storedHashedPassword, (err, valid) => {
          if (err) {
            console.error("Error comparing password:", err);
            return cb(err);
          } else {
            if (valid) {
              return cb(null, user);
            } else {
              return cb(null, false);
            }
          }
        });
      } else {
        return cb("User Not Found"); // Return false if user is not found
      }
    } catch (err) {
      console.log(err);
      return cb(err); // Handle error properly
    }
  })
);

passport.use(
  "google",
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/secrets",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    async (accessToken, refreshToken, profile, cb) => {
      try {
        console.log(profile);
        const email = profile.emails[0].value; // Correctly extract email
        const result = await db.query("SELECT * FROM users WHERE email = $1", [
          email,
        ]);
        if (result.rows.length === 0) {
          const newUser = await db.query(
            "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *",
            [email, "google"]
          );
          return cb(null, newUser.rows[0]);
        } else {
          return cb(null, result.rows[0]);
        }
      } catch (err) {
        return cb(err);
      }
    }
  )
);

passport.serializeUser((user, cb) => {
  cb(null, user);
});
passport.deserializeUser((user, cb) => {
  cb(null, user);
});

app.listen(process.env.PORT, () => {
  console.log(`Your Server is live at port ${process.env.PORT}`);
});
