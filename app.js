const express = require("express");
const es6 = require("express-es6-template-engine");
const  Sequelize  = require("sequelize");
const session = require("express-session");
const bcrypt = require("bcrypt");
const multer = require("multer");
const { Users, Pets, Pending } = require("./models");
const morgan = require('morgan')
const sharp = require('sharp');
const { S3Client, GetObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");
const { v4: uuidv4 } = require('uuid');
const AWS = require('aws-sdk')



const storage = multer.memoryStorage();
const upload = multer({ storage });

const app = express();
const PORT = process.env.DB_PORT || 3000;

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
require('dotenv').config();

const s3 = new AWS.S3({
  region: process.env.REGION,
  accessKeyId: process.env.ACCESS_KEY_ID,
  secretAccessKey: process.env.SECRET_ACCESS_KEY,
  signatureVersion: "v4"
});

app.get("/", async (req, res) => {
  const { name, age, gender, type } = req.query;
  const filter = { isAdopted: false};

  if (name) {
      filter.name = name;
  }

  if (age && age !== 'all') {
      filter.age = age;
  }

  if (gender && gender !== 'all') {
      filter.gender = gender;
  }

  if (type && type !== 'all') {
    filter.type = type;
}
  const pets = await Pets.findAll({
    attributes: ["name", "gender", "age", "id", "pics"],
    where: filter
    
  });

  for (const pet of pets) {
    pet.imageURL = `https://pet-images-dc.s3.amazonaws.com/${pet.pics}`;
  }
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

    const { name, weight, age, gender, type, bio } = req.body;

    const timestamp = Date.now().toString();
    const fileName = `pets/${timestamp}-${uuidv4()}.jpg`;

    const resizedImage = await sharp(req.file.buffer)
    .resize(614, 874)
    .jpeg() 
    .toBuffer();

    const params = {
      Bucket: 'pet-images-dc',
      Key: fileName,
      Body: req.file.buffer,
    };

    const s3Response = await s3.upload(params).promise();
    
  const newPet = await Pets.create({
        name,
        weight,
        age,
        gender,
        type,
        bio,
        isAdopted: false,
        ownerId: req.session.user.id,
        pics: fileName, 
      });
      res.json({ petId: newPet.id }); 
    })

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

  function titleCase(str) {
    return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }

  app.get("/profile/pet/:id", checkAuth, async (req, res) => {
    const { id } = req.params;
    const pet = await Pets.findOne({
      where: {
        id
      }
    });
  pet.imageURL = `https://pet-images-dc.s3.amazonaws.com/${pet.pics}`;
  pet.age = titleCase(pet.age);
  pet.gender = titleCase(pet.gender);

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

app.get("/contact/pet/:id", async (req, res) => {
  const { id } = req.params;
  
  const pet = await Pets.findOne({
    attributes: ["name"],
    where: {
      id,
    },
  });

  res.render("contact", {
    locals: {
      petId: id,
      pet
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
  const user = req.session.user;

  try {
    const pet = await Pets.findOne({
      attributes: ["ownerId", "name"],
      where: {
        id,
      },
    });
    const petName = pet.name
    console.log(pet)
    const ownerId = pet.ownerId;
    const owner = await Users.findOne({
      attributes: ["email"],
      where: {
        id: ownerId,
      },
    });
    const ownerEmail = owner.dataValues.email;

    await Pending.create({
      petId: id,
      userId: user.id,
    });

    const API_KEY = process.env.MAIL_KEY;
    const DOMAIN = process.env.MAIL_DOMAIN;
    const formData = require('form-data');
    const Mailgun = require('mailgun.js');
    const mailgun = new Mailgun(formData);
    const mg = mailgun.client({ username: 'api', key: API_KEY });

    await mg.messages.create(DOMAIN, {
      from: user.email,
      to: ownerEmail,
      subject: "I would like to adopt your pet " + petName + "!",
      text: body,
    });

    res.redirect("/profile/user/" + user.id);
  } catch (error) {
    console.error('Email sending error:', error);
    res.redirect("/profile/user/" + user.id);
  }
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
      res.redirect("/profile/user/" + sessId)
    }
  } 



  app.get("/profile/user/:id", checkAuth, checkId,  async (req, res) => {
    const { id } = req.params;
    const user = await Users.findOne({
      where: {
        id
      }
    });
  
    if (user.foster) {
      const pendings = await Pending.findAll({
        attributes: ["petId"],
        where: {
          userId: id
        }
      });
      const petIds = pendings.map((pending) => pending.petId);
      const pendingPets = await Pets.findAll({
        where: {
          id: petIds
        }
      });
      const usersPets = await Pets.findAll({
        where: {
          ownerId: id,
          isAdopted: false
        }
      });
  
      res.render("foster-profile", {
        locals: { 
          usersPets,
          pendingPets,
          name: user.name,
          email: user.email,
        }
      });
    } else {
      const pendings = await Pending.findAll({
        attributes: ["petId"],
        where: {
          userId: id
        }
      });
      const petIds = pendings.map((pending) => pending.petId);
      const pets = await Pets.findAll({
        where: {
          id: petIds
        }
      });
  
      res.render("profile", {
        locals: { 
          pets,
          name: user.name,
          email: user.email,
        }
      });
    }
  });




app.patch('/profile/user/email/:id',  async (req, res) => { 
  const userId = req.params.id;
  const { email } = req.body; 
  const user = await Users.findByPk(userId);

  if (email) {
    const existingUser = await Users.findOne({
      where: {
        email: email
      }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists in the database' });
    } else {
      user.email = email;
      await user.save();
      res.json({ success: true });
    }
  }
});

app.delete('/profile/user/:id', async (req, res) => {
  const { id } = req.params;
  const deletedUser = await Users.destroy({
      where: {
          id
      }
  }); 
  req.session.destroy();
  res.clearCookie('connect.sid')
  res.json(deletedUser);
});

app.post('/delete/pending/:petId', async (req, res) => {
  try {
      const { petId } = req.params;
      const userId = req.session.user.id;

      const pendingAdoption = await Pending.findOne({
          where: {
              petId,
              userId,
          },
      });

      if (!pendingAdoption) {
          return res.status(404).send('Pending adoption not found.');
      }

      await pendingAdoption.destroy();

      res.redirect('/profile/user/' + userId);
  } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error canceling pending adoption.' });
  }
});

app.post('/delete/all/:petId', async (req, res) => {
  try {
      const { petId } = req.params;
      const userId = req.session.user.id;

      const pendingAdoption = await Pending.findOne({
          where: {
              petId,
              userId,
          },
      });

      const pet = await Pets.findOne({
        where: {
            id: petId,
            ownerId: userId,
        },
    });

      if (pendingAdoption) {
        await pendingAdoption.destroy();
      }
      await pet.destroy();

      res.redirect('/profile/user/' + userId);
  } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error canceling pending adoption.' });
  }
});

app.post('/pet/adopted/:petId', async (req, res) => {
  try {
    const { petId } = req.params;
    const userId = req.session.user.id;

    const pendingAdoption = await Pending.findOne({
        where: {
            petId,
            userId,
        },
    });

    await Pets.update({ isAdopted: true }, {
      where: {
          id: petId,
      },
  });

    if (pendingAdoption) {
      await pendingAdoption.destroy();
    }
    res.redirect('/profile/user/' + userId);
  } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error canceling pending adoption.' });
  }
})


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
  if(req.session.user.foster){
    res.render("re-home", {
      partials: {
        nav: "partials/nav",
        mobilenav: "partials/mobilenav"
      }
    });
  } else {
    res.render("not-foster")
  }
});

app.get("/adopted", async (req, res) => {
  const { name, age, gender } = req.query;
  const filter = { isAdopted: true};

  if (name) {
      filter.name = name;
  }

  if (age && age !== 'all') {
      filter.age = age;
  }

  if (gender && gender !== 'all') {
      filter.gender = gender;
  }
  const pets = await Pets.findAll({
    attributes: ["name", "gender", "age", "id", "pics"],
    where: filter
    
  });

  for (const pet of pets) {
    pet.imageURL = `https://pet-images-dc.s3.amazonaws.com/${pet.pics}`;
  }
  res.render("recently-adopted", {
    locals: {
      pets
    },
    partials: {
      nav: "partials/nav",
      mobilenav: "partials/mobilenav"
    }
  });
});

app.listen(PORT, () => {
  console.log(`server started on port ${PORT}`);
});
