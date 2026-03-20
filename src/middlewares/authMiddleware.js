const jwt = require("jsonwebtoken")
const JWT_SECRET = "my-dev-secret"; 

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");
    if (!authHeader) {
      return res.status(401).json({ message: "Access denied. Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Access denied. Token missing" });
    }

    const decoded =jwt.verify(token, JWT_SECRET); // decode token
    req.user = decoded; // attach user info for routes

    next(); // continue to route
  } catch (error) {
    console.log("ERROR: ", error);
    return res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = authMiddleware