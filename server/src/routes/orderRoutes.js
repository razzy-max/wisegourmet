const express = require('express');
const {
  createOrderFromCart,
  getDeliveryZones,
  getMyOrders,
  getOrder,
  getAllOrders,
  getRiderOrders,
  getRiderQueue,
  acceptRiderOrder,
  assignRider,
  initiatePayment,
  verifyPayment,
  verifyDeliveryPin,
  updateOrderStatus,
} = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/', protect, authorize('customer'), createOrderFromCart);
router.get('/delivery-zones', protect, authorize('customer'), getDeliveryZones);
router.get('/my', protect, authorize('customer'), getMyOrders);
router.get('/rider/my', protect, authorize('rider'), getRiderOrders);
router.get('/rider/queue', protect, authorize('rider'), getRiderQueue);
router.patch('/:id/rider/accept', protect, authorize('rider'), acceptRiderOrder);
router.patch('/:id/rider/verify-pin', protect, authorize('rider'), verifyDeliveryPin);
router.get('/', protect, authorize('admin', 'staff'), getAllOrders);
router.patch('/:id/assign-rider', protect, authorize('admin', 'staff'), assignRider);
router.post('/:id/payment/initiate', protect, authorize('customer'), initiatePayment);
router.post('/:id/payment/verify', protect, authorize('customer'), verifyPayment);
router.patch('/:id/status', protect, authorize('admin', 'staff', 'rider'), updateOrderStatus);
router.get('/:id', protect, authorize('customer', 'admin', 'staff', 'rider', 'support'), getOrder);

module.exports = router;
