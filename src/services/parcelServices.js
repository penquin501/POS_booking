const connection = require("../env/db.js");
const bodyParser = require("body-parser");
const request = require("request");
const moment = require("moment");
const momentTimezone = require("moment-timezone");
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

    var sqlBillingNotSend = "SELECT billing_no FROM billing WHERE status = ?";
    var data=["ready", billing_no];

    var sqlUpdateStatus = "UPDATE billing SET status=? WHERE billing_no = ?";
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

    var sqlBillingNotSend = "SELECT billing_no FROM billing WHERE status = ?";
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

    var sqlBillingComplete = "SELECT billing_no FROM billing WHERE status = ?";
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
    var sqlBillingConfirmed = "SELECT billing_no FROM billing WHERE status = ?";
    var data = ["ready"];
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
    var sqlBilling = "SELECT billing_no FROM billing WHERE status = ?";
    var data = ["checking"];
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
  getBookingLog: () => {
    var current_date = momentTimezone(new Date()).tz("Asia/Bangkok").format("YYYY-MM-DD", true);
    var sqlBilling = "SELECT bb.tracking, bb.status, bi.tracking, bi.billing_no,bi.cod_value,br.receiver_name,br.phone,br.receiver_address,"+
    "d.DISTRICT_NAME,a.AMPHUR_NAME,p.PROVINCE_NAME,br.zipcode "+
    "FROM booking_tracking_batch bb "+
    "LEFT JOIN billing_item bi ON bb.tracking=bi.tracking "+
    "LEFT JOIN billing_receiver_info br ON bi.tracking=br.tracking "+
    "LEFT JOIN postinfo_district d ON br.district_id=d.DISTRICT_ID AND br.amphur_id=d.AMPHUR_ID AND br.province_id=d.PROVINCE_ID "+
    "LEFT JOIN postinfo_amphur a ON br.amphur_id=a.AMPHUR_ID "+
    "LEFT JOIN postinfo_province p ON br.province_id=p.PROVINCE_ID "+
    "WHERE Date(bb.send_record_at)=?";
    var data = [current_date];
    return new Promise(function(resolve, reject) {
      connection.query(sqlBilling, data, (error, results, fields) => {
        if (error === null) {
          resolve(results);
        } else {
          console.log("getBookingLog error=>", error);
          resolve(null);
        }
      });
    });
  },
};
