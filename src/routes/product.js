const app = require("express");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const path = require("path");
const { Product, ProductImage, Category } = require("../../models");
// const { Op } = require("sequelize");
const { Op, fn, col, where } = require("sequelize");
const authMiddleware = require("../middlewares/authMiddleware");
const router = app.Router();

//get all product
router.get("/", async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 1000; // temporary for testing all
    const offset = (page - 1) * limit;

    let whereCondition = {};

    // if (req.query.search) {
    //   whereCondition.name = { [Op.like]: `%${req.query.search}%` }; // works for MySQL
    // }
    if (req.query.search) {
      const search = req.query.search.toLowerCase();

      whereCondition.name = where(
        fn("LOWER", col("Product.name")), // specify Product table
        { [Op.like]: `%${search}%` }
      );
    }



    if (req.query.categoryId) {
      whereCondition.categoryId = Number(req.query.categoryId);
    }

    const { rows: products, count: total } = await Product.findAndCountAll({
      where: whereCondition,
      limit,
      offset,
      include: [
        { model: Category, as: "category" },
        { model: ProductImage, as: "images" },
      ],
      order: [["id", "ASC"]],
    });

    const totalPages = Math.ceil(total / limit);

    return res.json({
      message: "Product fetched successfully",
      data: products,
      pagination: {
        currentPage: page,
        limit,
        total,
        nextPage: page < totalPages ? page + 1 : null,
        prevPage: page > 1 ? page - 1 : null,
      },
    });
  } catch (error) {
    console.log("Fetching products error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

//add product
router.post("/",authMiddleware, async (req, res) => {
  try {
    const { name, price, categoryId,qty, description, isActive } = req.body;

    const createdProduct = await Product.create({
      name,
      price,
      categoryId,
      qty,
      description,
      isActive,
    });
    res.json({
      message: "Product created successfully",
      data: createdProduct,
    });
  } catch (error) {
    console.log("Creating product error:", error);
  }
});

// Image upload
router.post("/:id/upload", authMiddleware, async (req, res) => {
  try {
    // const file = req.files.file;
    // const productId = req.files.productId

    const { file } = req.files;
    const productId = req.params.id;

    // validate product id
    const product = await Product.findByPk(productId);
    if (!product) {
      res.json({
        message: `Product id=${productId} not found`,
      });
    }

    console.log("File", file);

    // UUI + file extension
    const fileName = `${uuidv4()}${path.extname(file.name)}`;

    //  Upload file to folder uploads/products
    //  Create file upload path
    const uploadPath = path.join(process.cwd(), "uploads/products", fileName);

    await file.mv(uploadPath);

    // Domain + fileName // domain.com/uploads/products/9871923712.png
    const domain = `${req.protocol}://${req.get("host")}`;
    const imageUrl = `${domain}/uploads/products/${fileName}`;

    const savedImage = await ProductImage.create({
      productId,
      imageUrl,
      fileName: file.name,
    });

    res.json({
      message: "Upload image successfully",
      data: savedImage,
    });
  } catch (error) { }
});

router.get("/images/:imageId/download", async (req, res) => {
  try {
    const { imageId } = req.params;

    const image = await ProductImage.findByPk(imageId);
    if (!image) {
      res.json({
        message: `Product image id=${imageId} not found`,
      });
    }

    const fileName = image.imageUrl.split("/").pop();
    console.log("File name", fileName);

    const filePath = path.join(process.cwd(), "uploads/products", fileName);

    if (!fs.existsSync(filePath)) {
      res.json({
        message: "File not found",
      });
    }

    console.log("Image data", image);
    res.download(filePath, image.fileName);
  } catch (error) { }
});

// Update product
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, categoryId, qty, description, isActive } = req.body;

    //  Find product with images
    const product = await Product.findByPk(id, {
      include: [{ model: ProductImage, as: "images" }],
    });

    if (!product) {
      return res.status(404).json({
        message: `Product id=${id} not found`,
      });
    }

    //  Update product info
    await product.update({
      ...(name !== undefined && { name }),
      ...(price !== undefined && { price }),
      ...(categoryId !== undefined && { categoryId }),
      ...(qty !== undefined && { qty }),
      ...(description !== undefined && { description }),
      ...(isActive !== undefined && { isActive }),
    });

    //  If admin uploads new image(s)
    if (req.files && req.files.file) {
      const files = Array.isArray(req.files.file)
        ? req.files.file
        : [req.files.file];

      // DELETE OLD IMAGES (DB + FILE)
      for (const img of product.images) {
        const oldFileName = img.imageUrl.split("/").pop();
        const oldPath = path.join(process.cwd(), "uploads/products", oldFileName);

        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath); // delete file
        }

        await img.destroy(); // delete DB record
      }

      //  SAVE NEW IMAGES
      const domain = `${req.protocol}://${req.get("host")}`;

      for (const file of files) {
        const newFileName = `${uuidv4()}${path.extname(file.name)}`;
        const uploadPath = path.join(process.cwd(), "uploads/products", newFileName);

        await file.mv(uploadPath);

        const imageUrl = `${domain}/uploads/products/${newFileName}`;

        await ProductImage.create({
          productId: id,
          imageUrl,
          fileName: file.name,
        });
      }
    }

    //  Return updated data
    const updatedProduct = await Product.findByPk(id, {
      include: [
        { model: Category, as: "category" },
        { model: ProductImage, as: "images" },
      ],
    });

    return res.json({
      message: "Product updated and images replaced successfully",
      data: updatedProduct,
    });

  } catch (error) {
    console.log("Update product error:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
});

// Delete product
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    //  Find product with images
    const product = await Product.findByPk(id, {
      include: [{ model: ProductImage, as: "images" }],
    });

    if (!product) {
      return res.status(404).json({
        message: `Product id=${id} not found`,
      });
    }

    //  Delete all images (file + DB)
    for (const img of product.images) {
      const fileName = img.imageUrl.split("/").pop();
      const filePath = path.join(process.cwd(), "uploads/products", fileName);

      // delete file from folder
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // delete DB record
      await img.destroy();
    }

    //  Delete product
    await product.destroy();

    return res.json({
      message: "Product deleted successfully",
    });

  } catch (error) {
    console.log("Delete product error:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
});

// Get product by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findByPk(id, {
      include: [
        { model: Category, as: "category" },
        { model: ProductImage, as: "images" },
      ],
    });

    if (!product) {
      return res.status(404).json({
        message: `Product id=${id} not found`,
      });
    }

    return res.json({
      message: "Product fetched successfully",
      data: product,
    });

  } catch (error) {
    console.log("Get product by id error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});
module.exports = router;
