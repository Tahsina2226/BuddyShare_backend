import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send(`
      <h1>BuddyShare API</h1>
      <p>Welcome to your Events & Activities Backend</p>
    `);
});

export default app;
