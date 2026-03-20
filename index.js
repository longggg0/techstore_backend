const express = require("express");
const db = require("./models");
const path = require("path");
const cors = require("cors");

const authRoute = require("./src/routes/auth");
const customerRoute = require("./src/routes/customer");
const userRoute = require("./src/routes/user");
const productRoute = require("./src/routes/product");
const orderRoute = require("./src/routes/order");
const categoryRoute = require("./src/routes/category");
const customerlogin = require("./src/routes/customer.routes")
const fileUpload = require("express-fileupload");

// const authMiddleware = require("./src/middlewares/authMiddleware");

const app = express();
const port = 3000;
const { Category, Product, Customer, Order, OrderDetail } = require("./models");

const allowedOrigins = [
  "http://localhost:3000",
  "https://www.abc.com",
  "http://localhost:5173",
  "http://localhost:5174"
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  // Add PATCH to the list below:
  methods: "GET,POST,PUT,PATCH,DELETE,OPTIONS", 
  credentials: true,
};

app.use(cors(corsOptions));

app.use(express.json());
app.use(
  fileUpload({
    limits: { fileSize: 30 * 1024 * 1024 }, // 30MB
    createParentPath: true,
  }),
);

app.use(
  "/uploads/products",
  express.static(path.join(process.cwd(), "uploads/products")),
);


db.sequelize
  .authenticate()
  .then(() => console.log("Database connected successfully"))
  .catch((err) => console.log("Unable connect to database", err));

app.use("/api/v1/auth", authRoute);
app.use("/api/v1/customers", customerRoute);
app.use("/api/v1/users", userRoute);
app.use("/api/v1/products", productRoute);
app.use("/api/v1/orders", orderRoute);
app.use("/api/v1/categories", categoryRoute);
app.use("/api/v1/customers-auth", customerlogin);

// app.post("/api/v1/orders", async (req, res) => {
//   try {
//     console.log("Request body", req.body);
//     const { orderNumber, customerId, location, items, discount } = req.body;

//     const customer = await Customer.findByPk(customerId);
//     console.log("Customer", customer);

//     if (!customer) {
//       return res.json({
//         message: "Customer not found",
//       });
//     }

//     const orderDetailsData = [];
//     let total = 0;
//     for (const item of items) {
//       const { productId, qty } = item;

//       // Get product info
//       const product = await Product.findByPk(productId);
//       if (!product) {
//         return res.json({
//           message: `Product id=${productId} not found`,
//         });
//       }

//       console.log("Product", product);
//       const amount = product.price * qty;

//       // total = total + amount
//       total += amount;

//       orderDetailsData.push({
//         productId,
//         productName: product.name,
//         productPrice: product.price,
//         qty,
//         amount,
//       });
//     }

//     console.log("OrderDetails", orderDetailsData);

//     // Create order into db
//     const createdOrder = await Order.create({
//       customerId,
//       orderNumber: orderNumber,
//       total: total,
//       discount: discount,
//       orderDate: new Date(),
//       location,
//     });

//     console.log("Created order", createdOrder);

//     // Create order detail into db

//     const orderDetails = orderDetailsData.map((item) => ({
//       productId: item.productId,
//       productName: item.productName,
//       productPrice: item.productPrice,
//       qty: item.qty,
//       amount: item.amount,
//       orderId: createdOrder.id,
//     }));

//     await OrderDetail.bulkCreate(orderDetails);

//     const completedOrder = await Order.findByPk(createdOrder.id, {
//       include: [
//         {
//           model: Customer,
//           as: "customer",
//         },
//         {
//           model: OrderDetail,
//           as: "orderDetails",
//         },
//       ],
//     });
//     res.json({
//       message: "Order completed",
//       data: completedOrder,
//     });
//   } catch (error) {
//   console.log("Error", error);
//   return res.status(500).json({
//     message: "Internal server error",
//   });
// }
// });

// app.post("/api/v1/orders", async (req, res) => {
//   try {
//     const { customerId, location, items } = req.body;

//     // 1️⃣ Check if customer exists
//     const customer = await Customer.findByPk(customerId);
//     if (!customer) {
//       return res.status(404).json({ message: "only registered customers can place orders." });
//     }

//     // 2️⃣ Auto-generate orderNumber
//     const lastOrder = await Order.findOne({ order: [["createdAt", "DESC"]] });
//     let orderNumber = 1;
//     if (lastOrder) {
//       const lastNum = parseInt(lastOrder.orderNumber.replace(/^ORD-0*/, "")) || 0;
//       orderNumber = lastNum + 1;
//     }
//     const formattedOrderNumber = `ORD-${orderNumber.toString().padStart(6, "0")}`;

//     // 3️⃣ Calculate total and prepare order details
//     const orderDetailsData = [];
//     let total = 0;

//     for (const item of items) {
//       const { productId, qty } = item;
//       const product = await Product.findByPk(productId);
//       if (!product) {
//         return res.status(404).json({ message: `Product id=${productId} not found` });
//       }

//       // ✅ Check stock availability
//       if (product.qty < qty) {
//         return res.status(400).json({ message: ` ${product.name} Out of stocks` });
//       }

//       const amount = parseFloat(product.price) * qty;
//       total += amount;

//       orderDetailsData.push({
//         productId,
//         productName: product.name,
//         productPrice: parseFloat(product.price),
//         qty,
//         amount,
//       });

//       // ✅ Decrease product stock
//       product.qty -= qty;
//       await product.save();
//     }

//     // 4️⃣ Create order
//     const createdOrder = await Order.create({
//       customerId,
//       orderNumber: formattedOrderNumber,
//       total,
//       orderDate: new Date(),
//       location,
//     });

//     // 5️⃣ Create order details
//     const orderDetails = orderDetailsData.map((item) => ({
//       ...item,
//       orderId: createdOrder.id,
//     }));
//     await OrderDetail.bulkCreate(orderDetails);

//     // 6️⃣ Return full order
//     const completedOrder = await Order.findByPk(createdOrder.id, {
//       include: [
//         { model: Customer, as: "customer" },
//         { model: OrderDetail, as: "orderDetails" },
//       ],
//     });

//     return res.json({
//       message: "Order completed",
//       data: completedOrder,
//     });

//   } catch (error) {
//     console.log("Error", error);
//     return res.status(500).json({ message: "Internal server error" });
//   }
// });

// app.post("/api/v1/categories", authMiddleware, async (req, res) => {
//   // Business logic

//   const name = req.body.name;
//   const isActive = req.body.isActive;

//   const created = await Category.create({ name, isActive });

//   res.json({
//     message: "Category created successfully",
//     data: created,
//   });
// });

// app.get("/api/v1/categories", authMiddleware, async (req, res) => {
//   try {
//     const categories = await Category.findAll({
//       include: [
//         {
//           model: Product,
//           as: "products",
//         },
//       ],
//       order: [["id", "ASC"]], // ✅ simple and works
//     });

//     res.json({
//       message: "Category fetched successfully",
//       data: categories,
//     });
//   } catch (error) {
//     console.error("Fetch categories error:", error);
//     res.status(500).json({
//       message: "Internal server error",
//     });
//   }
// });



app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
