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
  getBookingLog: () => {
    var sqlBilling = "SELECT bb.tracking, bb.status, bi.tracking, bi.billing_no,bi.cod_value,br.receiver_name,br.phone,br.receiver_address,d.DISTRICT_CODE,d.DISTRICT_NAME,a.AMPHUR_CODE,a.AMPHUR_NAME,p.PROVINCE_CODE,p.PROVINCE_NAME,z.zipcode "+
    "FROM booking_tracking_batch bb "+
    "LEFT JOIN billing_item_test bi ON bb.tracking=bi.tracking "+
    "LEFT JOIN billing_receiver_info_test br ON bi.tracking=br.tracking "+
    "LEFT JOIN postinfo_district d on br.district_id=d.DISTRICT_ID and br.amphur_id=d.AMPHUR_ID and br.province_id=d.PROVINCE_ID "+
    "LEFT JOIN postinfo_amphur a on d.amphur_id=a.AMPHUR_ID "+
    "LEFT JOIN postinfo_province p on d.province_id=p.PROVINCE_ID "+
    "LEFT JOIN postinfo_zipcodes z on d.DISTRICT_CODE=z.district_code "+
    "WHERE Date(bb.send_record_at)='2020-02-29'";
    var data = ["booking"];
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
