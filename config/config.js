const dotenv = require('dotenv');
dotenv.config();

module.exports = {
        development: {
            host: process.env.HOST,
            username: process.env.C_USER,
            password: process.env.C_PASS,
            database: process.env.C_DATABASE,
            dialect: "postgres",
            port: process.env.DB_PORT,
            dialectOptions: {
              ssl: {
                require: true, 
                rejectUnauthorized: false
              }}
        },
        test: {
          username: process.env.C_USER,
          password: process.env.C_PASS,
          database: process.env.C_DATABASE,
          host: process.env.HOST,
          dialect: "postgres"
        },
        production: {
          username: process.env.C_USER,
          password: process.env.C_PASS,
          database: process.env.C_DATABASE,
          host: process.env.C_HOST,
          port: process.env.DB_PORT,
          dialect: "postgres"
         
        }}