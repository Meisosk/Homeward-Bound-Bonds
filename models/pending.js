'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Pending extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Pending.belongsTo(models.Pets, { foreignKey: 'petId' });
      Pending.belongsTo(models.Users, { foreignKey: 'userId' });
    }
  }
  Pending.init({
    name: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Pending',
  });
  return Pending;
};