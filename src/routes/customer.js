const express = require("express");

const { Customer } = require("../../models");
const authMiddleware = require("../middlewares/authMiddleware");
const router = express.Router();

router.get("", async (req, res) => {
  try {
    const customers = await Customer.findAll({
      where: {
        role: "customer"  // Only include customers
      }
    })

    res.json({
      data: customers
    })
  } catch (error) {
    
  }
})

router.post("/", async (req, res) => {
  try {
    const { firstName, lastName, phone, password, email } = req.body;

    const createdCustomer = await Customer.create({
      firstName, lastName,
      name: `${firstName} ${lastName}`,
       phone, password, email
    });

    return res.json({
      message: "Customer created successfully",
      data: createdCustomer
    });

  } catch (error) {
    console.log("Create customer error:", error);

    return res.status(500).json({
      message: "Internal server error"
    });
  }
});

// Delete a customer by ID
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // Find the customer
    const customer = await Customer.findByPk(id);
    if (!customer) {
      return res.status(404).json({
        message: "Customer not found"
      });
    }

    // Delete the customer
    await customer.destroy();

    return res.json({
      message: "Customer deleted successfully",
      data: customer
    });
  } catch (error) {
    console.log("Delete customer error:", error);
    return res.status(500).json({
      message: "Internal server error"
    });
  }
});
module.exports = router;