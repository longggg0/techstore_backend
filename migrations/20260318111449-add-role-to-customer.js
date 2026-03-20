"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Customers", "role", {
      type: Sequelize.STRING,
      defaultValue: "customer",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("Customers", "role");
  },
};