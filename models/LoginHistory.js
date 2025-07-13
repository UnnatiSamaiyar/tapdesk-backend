

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const loginHistorySchema = new Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
  },
  loginTime: {
    type: Date,
    default: Date.now,
  },
  ipAddress: String,
  userAgent: String,
});

const LoginHistory = mongoose.model('LoginHistory', loginHistorySchema);

module.exports = LoginHistory;
