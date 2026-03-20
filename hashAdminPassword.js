// hashAdminPassword.js
const bcrypt = require("bcryptjs"); // ✅ use bcryptjs
const { Customer } = require("./models"); // adjust path if needed

(async () => {
  try {
    const admin = await Customer.findOne({ where: { email: "admin@gmail.com" } });

    if (!admin) {
      console.log("Admin not found in DB!");
      process.exit(1);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(admin.password, 10);
    admin.password = hashedPassword;
    await admin.save();

    console.log(" Admin password hashed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Error hashing admin password:", err);
    process.exit(1);
  }
})();