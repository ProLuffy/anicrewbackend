const router = require("express").Router();

router.get("/health", (req, res) => {
  res.json({ status: "Subtitle service is operational" });
});

module.exports = router;
