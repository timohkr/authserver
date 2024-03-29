const mysql = require("mysql2")
const Sequelize = require("sequelize");
const { config } = require("./setup")

// const setUpDB = async () => {
//     const connection = await mysql.createConnection({
//         host: process.env.HOST,
//         user: process.env.DBUSER,
//         password: process.env.PASSWORD,
//     });

//     // Run create database statement
//     await connection.execute(`CREATE DATABASE IF NOT EXISTS ${process.env.DATABASE}`);
//     // await connection.end()
// }

// setUpDB()


const sequelize = new Sequelize(
    ...config
    );


const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.user = require("../models/user.model.js")(sequelize, Sequelize);
db.role = require("../models/role.model.js")(sequelize, Sequelize);
db.userRecord = require("../models/userRecord.model.js")(sequelize, Sequelize);
db.userValidate = require("../models/userValidate.model.js")(sequelize, Sequelize);
db.gAuth = require("../models/gAuth.model.js")(sequelize, Sequelize);
db.authType = require("../models/authType.model.js")(sequelize, Sequelize);

db.role.belongsToMany(db.user, {
    through: "user_roles"
});
db.user.belongsToMany(db.role, {
    through: "user_roles"
});

db.authType.belongsTo(db.user, {
    through: "user_auth",
    foreignKey: "userId",
});

db.user.belongsToMany(db.authType, {
    through: "user_auth",
    foreignKey: "userId",
});



db.ROLES = ["user", "moderator", "admin"];
db.AUTHTYPES = ["otp", "gauth", "custom"]

module.exports = db