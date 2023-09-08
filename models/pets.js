'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Pets extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Pets.init({
    name: DataTypes.STRING,
    pics: DataTypes.STRING,
    age: DataTypes.STRING,
    gender: DataTypes.STRING,
    weight: DataTypes.INTEGER,
    type: DataTypes.STRING,
    bio: DataTypes.TEXT,
    isAdopted: DataTypes.BOOLEAN,
    ownerId: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Pets',
  });
  return Pets;
};