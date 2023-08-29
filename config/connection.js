const { Sequelize } = require('sequelize');
const config = require('./config.json');

const env = process.env.NODE_ENV || 'development';
const sequelize = new Sequelize(config[env]);

module.exports = sequelize;