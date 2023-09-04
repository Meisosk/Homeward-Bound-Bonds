
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
  const api_key = 'key-a1cc41e70644d1d012b4d30abc369814';
  const domain = 'sandboxd002fcec38864a7692e15ede0959674c.mailgun.org';
  const mailgun = require('mailgun-js')({apiKey: api_key, domain: domain});

const { body } = req.body;

const { id } = req.params;
  
  const user = req.session.user.email

  const pet = await Pets.findOne({
    attributes: ["ownerId"],
    where: {
      id,
    },
  });
  const ownerId = pet.ownerId
  const owner = await Users.findOne({
    attributes: ["email"],
    where: {
      id: ownerId
    },
  });
   ownerEmail = owner.dataValues.email

const data = {
from: 'Excited User ' + user,
to: ownerEmail,
subject: 'Im intrested in your dog',
text: body
};

mailgun.messages().send(data, function (error, body) {
console.log(body);
res.redirect("/profile/user/" + req.session.user.id)
});
})
  