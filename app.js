const express = require("express");
const es6 = require("express-es6-template-engine");
const Sequelize = require("sequelize");
const session = require("express-session");
const helmet = require("helmet");
const bcrypt = require("bcrypt");
const passport = require("passport");
const multer = require("multer");
const { Users, Pets } = require("./models");
const morgan = require('morgan')
const path = require("path")

const app = express();
const port = 3000;

app.engine("html", es6);
app.set("views", "views");
app.set("view engine", "html");
app.use(express.static("public"));
// app.use(express.static(path.join(__dirname, 'public')));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('tiny'))

app.get("/", (req, res) => {
  res.render("home");
});

app.post("/pet-profile", async (req, res) => {
  const { name, pics, age, gender, weight, type, bio, isAdopted, ownerId } =
    req.body;
  const newPet = await Pets.create({
    name,
    pics,
    age,
    gender,
    weight,
    type,
    bio,
    isAdopted,
    ownerId,
  });
  res.status(201).json(newPet);
});

//placeholder update route//
app.put("/pet-profile/:id", async (req, res) => {
  const petId = req.params.id;
  const { name, pics, age, gender, weight, type, bio, isAdopted, ownerId } =
    req.body;

  try {
    const pet = await Pets.findByPk(petId);

    if (name) pet.name = name;
    if (pics) pet.pics = pics;
    if (age) pet.age = age;
    if (gender) pet.gender = gender;
    if (weight) pet.weight = weight;
    // if (type) pet.type = type;
    if (bio) pet.bio = bio;
    if (isAdopted) pet.isAdopted = isAdopted;
    if (ownerId) pet.ownerId = ownerId;

    await pet.save();

    res.status(200).json(pet);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error! Try again later" });
  }
});

app.get("/signup", (req, res) => {
  res.render("sign-up");
});

app.post("/user/new", async (req, res) => {
  const { name, email, password, foster } = req.body;
  try {
    const newUser = await Users.create({
      name,
      email,
      password,
      foster,
    });

    res.redirect("/");
  } catch (error) {
    console.error("Error creating new post:", error);
    res.status(500).send("An error occurred while creating a new post.");
  }
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

app.get("/profile/user/:id", (req, res) => {
  res.render("profile");
});

app.delete('/profile/user/:id', async (req, res) => {
  const { id } = req.params;
  const deletedUser = await Users.destroy({
      where: {
          id
      }
  }); 
  res.json(deletedUser);
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
