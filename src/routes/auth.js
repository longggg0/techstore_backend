const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const { Customer } = require("../../models"); // ✅ Customers table
const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { firstName, lastName, email, password, gender } = req.body;

    const existing = await Customer.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: "Email already in use" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await Customer.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      gender,
    });

    return res.status(201).json({
      message: "User registered successfully",
      data: user,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await Customer.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: `Email ${email} not found` });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid password" });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.firstName + " " + user.lastName,
      },
      process.env.JWT_SECRET || "express",
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      message: "User logged in successfully",
      data: token,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;