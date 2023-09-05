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
// const sharp = require('sharp');
const path = require("path")

const storage = multer.memoryStorage();
const upload = multer({ storage });

const app = express();
const port = 3000;

app.engine("html", es6);
app.set("views", "views");
app.set("view engine", "html");
app.use(express.static("public"));



const SequelizeStore = 
      require("connect-session-sequelize")(session.Store)
const store = new SequelizeStore({ db: Users.sequelize})

app.use(session({
  secret: "this is secret",
  resave: false,
  saveUninitialized: false,
  store: store
}))
store.sync()

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('tiny'))



app.get("/", async (req, res) => {
  const pets = await Pets.findAll({
    attributes: ["name", "gender", "age", "id", "pics"],
  });
  res.render("home", {
    locals: {
      pets
    },
    partials: {
      nav: "partials/nav",
      mobilenav: "partials/mobilenav"
    }
  });
});


app.post('/pet/new', upload.single('petPhoto'), async (req, res) => {
  try {
    // Get the pet information from the request body
    const { name, weight, age, gender, type, bio } = req.body;

    // req.file.buffer contains the uploaded image data
    if (!req.file) {
      return res.status(400).send('No image uploaded.');
    }

    const newPet = await Pets.create({
      name,
      weight,
      age,
      gender,
      type,
      bio,
      isAdopted: false,
      ownerId: req.session.user.id,
      pics: req.file.buffer, 
    });
    
    res.redirect('/profile/pet/' + newPet.id); 
  } catch (error) {
    console.error(error);
    res.redirect('/error');
  }
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
  if (email === "" || password === "") {
    console.log("username or password is blank");
  } else {
    const salt = 10
    const hash = await bcrypt.hash(password, salt);
    try {
        const newUser = await Users.create({
          name,
          email,
          password: hash, 
          foster
        })
      res.redirect("/signin");
    } catch (e) {
      if (e.name === "SequelizeUniqueConstraintError") {
        console.log("Email is already taken");
      }
      res.redirect("/signup");
    }
  }
})

app.get("/signin", (req, res) => {
  res.render("sign-in");
});

app.post("/user/signin", async (req, res) => {
  const { email, password} = req.body;
    const user = await Users.findOne({
      where: {
        email,
      },
    });
    if (user) {
      bcrypt.compare(password, user.password, (err, result) => {
        if (result) {
          req.session.user = user
          req.session.save(() =>{
            res.redirect("/profile/user/" + user.id)
          })
        } else {
          res.redirect("/signin");
        }
      })
    } else {
      res.redirect("/signin");
    }
  });

  app.get("/profile/pet/:id", checkAuth, async (req, res) => {
    const { id } = req.params;
    const pet = await Pets.findOne({
      where: {
        id
      }
    });
    res.render("pet-profile", {
      locals: { 
        pet,    
      },
      partials: {
        nav: "partials/nav",
        mobilenav: "partials/mobilenav"
      }
  });
});
// http://localhost:3000/contact/pet/20
app.get("/contact/pet/:id", async (req, res) => {
  const { id } = req.params;
  
  res.render("contact", {
    locals: {
      petId: id
    },
    partials: {
      nav: "partials/nav",
      mobilenav: "partials/mobilenav"
    }
  });
})

app.post("/contact/pet/:id", async (req, res) => {
  const { body } = req.body;
  const { id } = req.params;
  const user = req.session.user.email;

  const pet = await Pets.findOne({
    attributes: ["ownerId"],
    where: {
      id,
    },
  });
  const ownerId = pet.ownerId;
  const owner = await Users.findOne({
    attributes: ["email"],
    where: {
      id: ownerId,
    },
  });
  const ownerEmail = owner.dataValues.email;

  const API_KEY = 'key-a1cc41e70644d1d012b4d30abc369814';
  const DOMAIN = 'sandboxd002fcec38864a7692e15ede0959674c.mailgun.org';
  const formData = require('form-data');
  const Mailgun = require('mailgun.js');
  const mailgun = new Mailgun(formData);
  const mg = mailgun.client({username: 'api', key:  API_KEY});
  
  mg.messages.create(DOMAIN, {
    from: user,
    to: ownerEmail,
    subject: "I would like to adopt your pet!",
    text: body,
  })
  .then(msg => {
    console.log(msg)
    res.redirect("/profile/user/" + req.session.user.id);
  })
    .catch((error) => {
      console.error('Email sending error:', error);
      res.redirect("/profile/user/" + req.session.user.id);
    });
});


function checkAuth(req, res, next) {
  if(req.session.user){
      next()
    } else {
      res.redirect("/signin")
    }
  } 


function checkId(req, res, next) {
    const sessId = req.session.user.id
    const paramId = parseInt(req.params.id )   
    if(sessId == paramId){
      next()
    } else {
      res.redirect("/")
    }
  } 



app.get("/profile/user/:id", checkAuth, checkId, async (req, res) => {
  const { id } = req.params;
  const user = await Users.findOne({
    where: {
      id
    }
  });
  res.render("profile", {
    user,
    locals: { 
      name: user.name,
      email: user.email
    
    },
    partials: {
      nav: "partials/nav",
      mobilenav: "partials/mobilenav"
    }

});
})


app.put('/profile/user/:id', async (req, res) => {
  const userId = req.params.id;
  const {newEmail} = req.body;
  const user = await Users.findByPk(userId);

  if (newEmail) user.email = newEmail;
  await user.save();
  res.json(user);
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

app.post("/logout", async (req, res) => {
  try {
    req.session.destroy();
    res.clearCookie('connect.sid')
    res.redirect("/");
  } catch (error) {
    console.error('Error destroying session:', error);
    res.status(500).send("An error occurred while logging out.");
  }
});

app.get("/rehome", checkAuth, (req, res) => {
  res.render("re-home", {
    partials: {
      nav: "partials/nav",
      mobilenav: "partials/mobilenav"
    }
  });
});



app.get("/adopted", (req, res) => {
  res.render("recently-adopted");
});

app.get("/issignedin", (req, res) => {
  const response = {
    isSignedIn: req.session.user ? true : false,
    userId: req.session.user ? req.session.user.id : null
  };
  res.json(response);
});

app.listen(port, () => {
  console.log(`Example app listening on http://localhost:${port}`);
});
