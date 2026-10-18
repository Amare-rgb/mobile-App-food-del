const express = require("express");
const router = express.Router();
const gpsController = require("../controller/gps.controller");
const { authenticate } = require("../middleware/auth");

router.use(authenticate);

router.post("/courier/location", gpsController.pushLocation);
router.post("/offline", gpsController.goOffline);
router.get("/order/:orderId/courier", gpsController.getCourierForOrder);
router.get("/order/:orderId/history", gpsController.getOrderHistory);
router.get("/couriers/online", gpsController.listOnlineCouriers);

module.exports = router;