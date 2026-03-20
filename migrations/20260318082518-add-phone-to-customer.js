"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Customers", "phone", {
      type: Sequelize.STRING,
      allowNull: true, // change to false if you want phone to be required
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("Customers", "phone");
  },
};