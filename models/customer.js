"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Customer extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Customer.hasMany(models.Order, {
        foreignKey: "customerId",
        as: "orders"
      })
    }
  }
  Customer.init(
    {
      firstName: DataTypes.STRING,
      lastName: DataTypes.STRING,
      password: DataTypes.STRING,
      phone: DataTypes.STRING,
      name: DataTypes.STRING,
      email: DataTypes.STRING,
       role: {
      type: DataTypes.STRING,
      defaultValue: "customer",
    },
    },
    {
      sequelize,
      modelName: "Customer",
    },
  );
  return Customer;
};
