'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Adopted extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Adopted.belongsTo(models.Pets, { foreignKey: 'petId' });
      Adopted.belongsTo(models.Users, { foreignKey: 'userId' });
    }
  }
  Adopted.init({
    name: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Adopted',
  });
  return Adopted;
};