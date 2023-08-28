const express = require('express')
const es6 = require("express-es6-template-engine")
const Sequelize = require('sequelize');
const session = require('express-session')

const app = express()
const port = 3000

app.engine('html', es6);
app.set('view engine', 'html');
app.use(express.static('public'))


app.use(express.json())
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.render("desk")
})

app.get('/example', (req, res) => {
    res.render("example")
})

app.listen(port, () => {
console.log(`Example app listening on http://localhost:${port}`)
})