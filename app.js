const express = require("express");
const es6 = require("express-es6-template-engine");
const Sequelize = require("sequelize");
const session = require("express-session");
const helmet = require("helmet");
const bcrypt = require("bcrypt");
const passport = require("passport");
// const {} = require("./models");

const app = express();
const port = 3000;

app.engine("html", es6);
app.set("views", "views");
app.set("view engine", "html");
app.use(express.static("public"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.render("home");
});

app.get("/signup", (req, res) => {
  res.render("sign-up");
});

app.get("/signin", (req, res) => {
  res.render("sign-in");
});

app.get("/profile/pet", (req, res) => {
  res.render("pet-profile");
});

app.get("/contact", (req, res) => {
  res.render("contact");
});

app.get("/profile/user", (req, res) => {
  res.render("profile");
});

app.get("/rehome", (req, res) => {
  res.render("re-home");
});

app.get("/adopted", (req, res) => {
  res.render("recently-adopted");
});

app.listen(port, () => {
  console.log(`Example app listening on http://localhost:${port}`);
});
