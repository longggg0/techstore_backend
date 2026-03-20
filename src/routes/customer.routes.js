const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Customer } = require("../../models");

const router = express.Router();
const JWT_SECRET = "my-dev-secret"; // simple dev secret

// REGISTER
router.post("/register", async (req, res) => {
  try {
    const { firstName, lastName, phone, email, password } = req.body;

    const existing = await Customer.findOne({ where: { email } });
    if (existing) return res.status(400).json({ message: "Email exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const customer = await Customer.create({
      firstName,
      lastName,
      name: `${firstName} ${lastName}`,
      phone,
      email,
      password: hashedPassword,
    });

    // ✅ Generate JWT token immediately after registration
    const token = jwt.sign(
      { id: customer.id, email: customer.email },
      JWT_SECRET
    );

    res.json({
      message: "Customer registered successfully",
      data: {
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone,
        email: customer.email,
        token, // <- include token here
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
});
// LOGIN

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // find user (admin or customer)
    const user = await Customer.findOne({ where: { email } });
    if (!user) return res.status(404).json({ message: "Email or password incorrect" });

    // compare hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(404).json({ message: "Email or password incorrect" });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" } // optional: set token expiration
    );
    // send back user info
    return res.json({
      message: "Login success",
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        token
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;