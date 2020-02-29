const connection = require("../env/db.js");
const bodyParser = require("body-parser");
const request = require("request");
const moment = require("moment");
moment.locale("th");

module.exports = {
  saveBatch: (status,billing_no) => {
    var sqlSaveBatch = "INSERT INTO booking(booking_time, booking_state) VALUES (?,?)";
    var data = [new Date(),status];
    return new Promise(function(resolve, reject) {
      connection.query(sqlSaveBatch, data, (error, results, fields) => {});
    });
  },
  updateConfirm: (status, billing_no) => {

    var sqlBillingNotSend = "SELECT billing_no FROM billing_test WHERE status = ?";
    var data=["ready", billing_no];

    var sqlUpdateStatus = "UPDATE billing_test SET status=? WHERE billing_no = ?";
    var dataStatus=[status, billing_no];

    return new Promise(function(resolve, reject) {
      connection.query(sqlBillingNotSend,data, (error, results, fields) => {
        if (error === null) {
          connection.query(sqlUpdateStatus,dataStatus, (error, results, fields) => {})
        } 
      });
    });
  },
  checkDataPrepare: () => {

    var sqlBillingNotSend = "SELECT billing_no FROM billing_test WHERE status = ?";
    var data = ["ready"];
    return new Promise(function(resolve, reject) {
      connection.query(sqlBillingNotSend, data, (error, results, fields) => {
        if (error === null) {
          resolve(results);
        } else {
          console.log("check_data_prepare error=>", error);
          resolve(null);
        }
      });
    });
  },
  checkCompleteData: () => {

    var sqlBillingComplete = "SELECT billing_no FROM billing_test WHERE status = ?";
    var data = ["complete"];
    return new Promise(function(resolve, reject) {
      connection.query(sqlBillingComplete, data, (error, results, fields) => {
        if (error === null) {
          resolve(results);
        } else {
          console.log("check_data_prepare error=>", error);
          resolve(null);
        }
      });
    });
  },
  prepareRawData: () => {
    var sqlBillingConfirmed = "SELECT billing_no FROM billing_test WHERE status = ?";
    var data = ["confirm"];
    return new Promise(function(resolve, reject) {
      connection.query(sqlBillingConfirmed, data, (error, results, fields) => {
        if (error === null) {
          resolve(results);
        } else {
          console.log("check_data_prepare error=>", error);
          resolve(null);
        }
      });
    });
  },
  listResponseNotBooked: () => {
    var sqlTrackingBatch = "SELECT tracking,status,res_json FROM booking_tracking_batch WHERE status != ?";
    var data = ["booked"];
    return new Promise(function(resolve, reject) {
      connection.query(sqlTrackingBatch, data, (error, results, fields) => {
        if (error === null) {
          resolve(results);
        } else {
          console.log("check_data_response error=>", error);
          resolve(null);
        }
      });
    });
  },
  listBillingNotBooked: () => {
    var sqlBilling = "SELECT billing_no FROM billing_test WHERE status = ?";
    var data = ["booking"];
    return new Promise(function(resolve, reject) {
      connection.query(sqlBilling, data, (error, results, fields) => {
        if (error === null) {
          resolve(results);
        } else {
          console.log("listBillingNotBooked error=>", error);
          resolve(null);
        }
      });
    });
  },
};
