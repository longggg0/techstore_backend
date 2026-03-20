"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Products", "description", {
      type: Sequelize.TEXT,
      allowNull: true, // or false if required
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("Products", "description");
  },
};