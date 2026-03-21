const express = require("express");

const router = express.Router();

function setNoCacheHeaders(res) {
  res.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate",
  );
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  res.set("Surrogate-Control", "no-store");
}

router.get("/health", (req, res) => {
  setNoCacheHeaders(res);
  res.status(200).json({
    ok: true,
    service: "Musafir",
    timestamp: new Date().toISOString(),
  });
});

router.head("/health", (req, res) => {
  setNoCacheHeaders(res);
  res.sendStatus(200);
});

module.exports = router;
