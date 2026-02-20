import categoryModel from "../models/categoryModel.js";
import slugify from "slugify";
export const createCategoryController = async (req, res) => {
  try {
    const { name  } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).send({ message: "Name is required" });
    }
    const trimmedName = name.trim();
    const slug = slugify(trimmedName, { lower: true });

    const existingCategory = await categoryModel.findOne({ slug });
    if (existingCategory) {
      return res.status(409).send({
        message: "Category already exists",
      });
    }
    
    const category = await new categoryModel({
      name: trimmedName,
      slug: slug,
    }).save();
    res.status(201).send({
      message: "New Category created",
      category,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      error,
      message: "Error in Category",
    });
  }
};

//update category
export const updateCategoryController = async (req, res) => {
  try {
    const { name } = req.body;
    const { id } = req.params;
    
    // Validate name
    if (!name || !name.trim()) {
      return res.status(400).send({ message: "Name is required" });
    }
    
    // Validate id
    if (!id || !id.trim()) {
      return res.status(400).send({ message: "Category ID is required" });
    }
    
    // Trim whitespace from name
    const trimmedName = name.trim();
    
    const category = await categoryModel.findByIdAndUpdate(
      id,
      { name: trimmedName, slug: slugify(trimmedName, { lower: true }) },
      { new: true }
    );
    
    // Check if category was found
    if (!category) {
      return res.status(404).send({
        message: "Category not found",
      });
    }
    
    res.status(200).send({
      message: "Category updated successfully",
      category,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      error,
      message: "Error while updating Category",
    });
  }
};

// get all cat
export const categoryController = async (req, res) => {
  try {
    const category = await categoryModel.find({});
    res.status(200).send({
      success: true,
      message: "All Categories List",
      category,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      error,
      message: "Error while getting all categories",
    });
  }
};

// single category
export const singleCategoryController = async (req, res) => {
  try {
    const { slug } = req.params;
    
    // Trim whitespace from slug
    const trimmedSlug = slug.trim();
    
    const category = await categoryModel.findOne({ slug: trimmedSlug });
    
    // Check if category was found
    if (!category) {
      return res.status(404).send({
        success: false,
        message: "Category not found",
      });
    }
    
    res.status(200).send({
      success: true,
      message: "Get single category successfully",
      category,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      error,
      message: "Error while getting single category",
    });
  }
};

//delete category
export const deleteCategoryController = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate id
    if (!id || !id.trim()) {
      return res.status(400).send({ message: "Category ID is required" });
    }
    
    // Trim whitespace from id
    const trimmedId = id.trim();
    
    const category = await categoryModel.findByIdAndDelete(trimmedId);
    
    // Check if category was found and deleted
    if (!category) {
      return res.status(404).send({
        message: "Category not found",
      });
    }
    
    res.status(200).send({
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      message: "Error while deleting Category",
      error,
    });
  }
};
