// src/routes/api/locations.js
import express from "express";
import { connectDB } from "@/lib/db";
import State from "@/models/State";
import City  from "@/models/City";

const router = express.Router();

// GET /api/states
router.get("/states", async (req, res) => {
  await connectDB();
  const states = await State.find({}, { name: 1 }).sort("name");
  res.json({ success: true, data: states });
});

// POST /api/cities
// body: { stateId: "6887352d04babf932f1c228d" }
router.post("/cities", async (req, res) => {
  const { stateId } = req.body;
  if (!stateId) {
    return res.status(400).json({ success: false, error: "stateId is required" });
  }

  await connectDB();
  // verify state exists (optional)
  const state = await State.findById(stateId);
  if (!state) {
    return res.status(404).json({ success: false, error: "State not found" });
  }

  const cities = await City.find({ stateId }, { name: 1 }).sort("name");
  res.json({ success: true, data: cities });
});

export default router;