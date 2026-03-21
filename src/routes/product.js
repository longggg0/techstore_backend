const app = require("express");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const path = require("path");
const { Product, ProductImage, Category } = require("../../models");
const cloudinary = require("../../config/cloudinary");
const { Op, fn, col, where } = require("sequelize");
const authMiddleware = require("../middlewares/authMiddleware");
const router = app.Router();

//get all product
router.get("/", async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 1000;
    const offset = (page - 1) * limit;

    let whereCondition = {};

    if (req.query.search) {
      const search = req.query.search.toLowerCase();
      whereCondition.name = where(
        fn("LOWER", col("Product.name")),
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

// Add product
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { name, price, categoryId, qty, description, isActive } = req.body;

    const createdProduct = await Product.create({
      name,
      price,
      categoryId,
      qty,
      description,
      isActive,
    });

    return res.json({
      message: "Product created successfully",
      data: createdProduct,
    });
  } catch (error) {
    console.log("Creating product error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Image upload
router.post("/:id/upload", authMiddleware, async (req, res) => {
  try {
    const { file } = req.files;
    const productId = req.params.id;

    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({ message: `Product id=${productId} not found` });
    }

    // ✅ Upload to Cloudinary
    const result = await cloudinary.uploader.upload(file.tempFilePath, {
      folder: "techstore/products",
    });

    const savedImage = await ProductImage.create({
      productId,
      imageUrl: result.secure_url,
      fileName: file.name,
      cloudinaryId: result.public_id, // ✅ save for future deletion
    });

    return res.json({
      message: "Upload image successfully",
      data: savedImage,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: error.message });
  }
});

// Download image - kept for backward compatibility
router.get("/images/:imageId/download", async (req, res) => {
  try {
    const { imageId } = req.params;

    const image = await ProductImage.findByPk(imageId);
    if (!image) {
      return res.status(404).json({ message: `Product image id=${imageId} not found` });
    }

    // ✅ Redirect to Cloudinary URL instead of local file
    return res.redirect(image.imageUrl);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Update product
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, categoryId, qty, description, isActive } = req.body;

    const product = await Product.findByPk(id, {
      include: [{ model: ProductImage, as: "images" }],
    });

    if (!product) {
      return res.status(404).json({ message: `Product id=${id} not found` });
    }

    await product.update({
      ...(name !== undefined && { name }),
      ...(price !== undefined && { price }),
      ...(categoryId !== undefined && { categoryId }),
      ...(qty !== undefined && { qty }),
      ...(description !== undefined && { description }),
      ...(isActive !== undefined && { isActive }),
    });

    if (req.files && req.files.file) {
      const files = Array.isArray(req.files.file)
        ? req.files.file
        : [req.files.file];

      // ✅ Delete old images from Cloudinary + DB
      for (const img of product.images) {
        if (img.cloudinaryId) {
          await cloudinary.uploader.destroy(img.cloudinaryId);
        }
        await img.destroy();
      }

      // ✅ Upload new images to Cloudinary
      for (const file of files) {
        const result = await cloudinary.uploader.upload(file.tempFilePath, {
          folder: "techstore/products",
        });

        await ProductImage.create({
          productId: id,
          imageUrl: result.secure_url,
          fileName: file.name,
          cloudinaryId: result.public_id, // ✅ save for future deletion
        });
      }
    }

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
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Delete product
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findByPk(id, {
      include: [{ model: ProductImage, as: "images" }],
    });

    if (!product) {
      return res.status(404).json({ message: `Product id=${id} not found` });
    }

    // ✅ Delete from Cloudinary + DB
    for (const img of product.images) {
      if (img.cloudinaryId) {
        await cloudinary.uploader.destroy(img.cloudinaryId);
      }
      await img.destroy();
    }

    await product.destroy();

    return res.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.log("Delete product error:", error);
    return res.status(500).json({ message: "Internal server error" });
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
      return res.status(404).json({ message: `Product id=${id} not found` });
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