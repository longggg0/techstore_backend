const app = require("express");
const { Order, Customer, OrderDetail, Product } = require("../../models");
const generateDoc = require("../utils/generateOrderDoc");

const router = app.Router();

// router.get("/:orderId/generate-doc", async (req, res) => {
//   try {
//     const { orderId } = req.params;

//     const order = await Order.findByPk(orderId, {
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

//     console.log(JSON.stringify(order, null, 2));
//     console.log("Order", order);
//     const buffer = generateDoc(order);
//     res.setHeader(
//       "Content-Disposition",
//       `attachment; filename=order-${order.orderNumber}.docx`,
//     );
//     res.setHeader(
//       "Content-Type",
//       "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
//     );

//     res.send(buffer);
//   } catch (error) {
//     console.error("Error:", error);
//     res.status(500).json({
//       message: "Internal server error",
//     });
//   }
// });

router.get("/:orderId/generate-doc", async (req, res) => {
  try {
    const { orderId } = req.params;

    // Include customer and order details
    const order = await Order.findByPk(orderId, {
      include: [
        { model: Customer, as: "customer" },
        { model: OrderDetail, as: "orderDetails" },
      ],
    });

    if (!order) return res.status(404).json({ message: "Order not found" });

    const buffer = generateDoc(order);

    res.setHeader("Content-Disposition", `attachment; filename=order-${order.orderNumber}.docx`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");

    res.send(buffer);

  } catch (error) {
    console.error("Error generating invoice:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // 🔍 Find order with details
    const order = await Order.findByPk(id, {
      include: [{ model: OrderDetail, as: "orderDetails" }],
    });

    if (!order) {
      return res.status(404).json({ message: `Order id=${id} not found` });
    }

    // 🔹 Delete order details first
    for (const detail of order.orderDetails) {
      await detail.destroy();
    }

    // 🔹 Delete the order itself
    await order.destroy();

    return res.json({ message: "Order deleted successfully" });

  } catch (error) {
    console.log("Delete order error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// router.get("/", async (req, res) => {
//   try {
//     // const page = Number(req.query.page) || 1;
//     // const limit = Number(req.query.limit) || 20;
//     // const offset = (page - 1) * limit;

//     const { rows: orders, count: total } = await Order.findAndCountAll({
//       include: [
//         { model: Customer, as: "customer" },
//         { model: OrderDetail, as: "orderDetails" },
//       ],
//       order: [["id", "ASC"]], // latest orders first
//       // limit,
//       // offset,
//     });

//     // const totalPages = Math.ceil(total / limit);

//     return res.json({
//       message: "Orders fetched successfully",
//       data: orders,
//       // pagination: {
//       //   currentPage: page,
//       //   limit,
//       //   total,
//       //   nextPage: page < totalPages ? page + 1 : null,
//       //   prevPage: page > 1 ? page - 1 : null,
//       // },
//     });
//   } catch (error) {
//     console.log("Get orders error:", error);
//     return res.status(500).json({ message: "Internal server error" });
//   }
// });
// GET single order by ID

router.get("/", async (req, res) => {
  try {
    const { customerId } = req.query;

    const where = {};
    if (customerId) {
      where.customerId = customerId; // filter orders by customer
    }

    const { rows: orders, count: total } = await Order.findAndCountAll({
      where,
      include: [
        { model: Customer, as: "customer" },
        { model: OrderDetail, as: "orderDetails" },
      ],
      order: [["id", "ASC"]],
    });

    return res.json({
      message: "Orders fetched successfully",
      data: orders,
    });
  } catch (error) {
    console.log("Get orders error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findByPk(orderId, {
      include: [
        { model: Customer, as: "customer" },
        { model: OrderDetail, as: "orderDetails" },
      ],
    });

    if (!order) {
      return res.status(404).json({ message: `Order id=${orderId} not found` });
    }

    return res.json({
      message: "Order fetched successfully",
      data: order,
    });
  } catch (error) {
    console.error("Get order by ID error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

//create order
router.post("/", async (req, res) => {
  try {
    const { customerId, location, items } = req.body;

    // 1️⃣ Check if customer exists
    const customer = await Customer.findByPk(customerId);
    if (!customer) {
      return res.status(404).json({ message: "only registered customers can place orders." });
    }

    // 2️⃣ Auto-generate orderNumber
    const lastOrder = await Order.findOne({ order: [["createdAt", "DESC"]] });
    let orderNumber = 1;
    if (lastOrder) {
      const lastNum = parseInt(lastOrder.orderNumber.replace(/^ORD-0*/, "")) || 0;
      orderNumber = lastNum + 1;
    }
    const formattedOrderNumber = `ORD-${orderNumber.toString().padStart(6, "0")}`;

    // 3️⃣ Calculate total and prepare order details
    const orderDetailsData = [];
    let total = 0;

    for (const item of items) {
      const { productId, qty } = item;
      const product = await Product.findByPk(productId);
      if (!product) {
        return res.status(404).json({ message: `Product id=${productId} not found` });
      }

      // ✅ Check stock availability
      if (product.qty < qty) {
        return res.status(400).json({ message: ` ${product.name} Out of stocks` });
      }

      const amount = parseFloat(product.price) * qty;
      total += amount;

      orderDetailsData.push({
        productId,
        productName: product.name,
        productPrice: parseFloat(product.price),
        qty,
        amount,
      });

      // ✅ Decrease product stock
      product.qty -= qty;
      await product.save();
    }

    // 4️⃣ Create order
    const createdOrder = await Order.create({
      customerId,
      orderNumber: formattedOrderNumber,
      total,
      orderDate: new Date(),
      location,
    });

    // 5️⃣ Create order details
    const orderDetails = orderDetailsData.map((item) => ({
      ...item,
      orderId: createdOrder.id,
    }));
    await OrderDetail.bulkCreate(orderDetails);

    // 6️⃣ Return full order
    const completedOrder = await Order.findByPk(createdOrder.id, {
      include: [
        { model: Customer, as: "customer" },
        { model: OrderDetail, as: "orderDetails" },
      ],
    });

    return res.json({
      message: "Order completed",
      data: completedOrder,
    });

  } catch (error) {
    console.log("Error", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Search orders by customer name
router.get("/search/by-name", async (req, res) => {
  try {
    const { name } = req.query;

    if (!name) {
      return res.status(400).json({ message: "Please provide a name to search" });
    }

    const orders = await Order.findAll({
      include: [
        {
          model: Customer,
          as: "customer",
          where: {
            // Search by firstName or lastName using SQL LIKE
            [require("sequelize").Op.or]: [
              { firstName: { [require("sequelize").Op.iLike]: `%${name}%` } },
              { lastName: { [require("sequelize").Op.iLike]: `%${name}%` } },
              // optional: full name
              require("sequelize").where(
                require("sequelize").fn(
                  "concat",
                  require("sequelize").col("firstName"),
                  " ",
                  require("sequelize").col("lastName")
                ),
                { [require("sequelize").Op.iLike]: `%${name}%` }
              ),
            ],
          },
        },
        { model: OrderDetail, as: "orderDetails" },
      ],
      order: [["id", "ASC"]],
    });

    return res.json({
      message: "Orders fetched successfully",
      data: orders,
    });
  } catch (error) {
    console.error("Search orders by name error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
