const connection = require("../env/db");
const request = require("request");

const moment = require("moment");
const momentTimezone = require("moment-timezone");

module.exports = bus => {
  bus.on("check_res", msg => {
    console.log("check_res", msg.tracking);
    var res_json = JSON.parse(msg.res_json);

    var responseCode = res_json.manifestResponse.bd.responseStatus.code;
    var responseMessage = res_json.manifestResponse.bd.responseStatus.message;
    var booking_status = 0;
    var status = "";
    if (msg.status == "pass") {
      if (responseCode == 200 && responseMessage == "SUCCESS") {
        booking_status = 100;
        status = "booked";
      } else {
        booking_status = 5;
        status = "fail";
      }
    } else {
      booking_status = 5;
      status = "fail";
    }

    let updateReceiver = "UPDATE billing_receiver_info_test SET booking_status=?,booking_date=? WHERE tracking=?";
    let dataReceiver = [booking_status, new Date(), msg.tracking];
    connection.query(updateReceiver, dataReceiver, (err, results) => {});

    let updateTrackingBatch = "UPDATE booking_tracking_batch SET status=? WHERE tracking=?";
    let dataTrackingBatch = [status, msg.tracking];
    connection.query(updateTrackingBatch,dataTrackingBatch,(err, results) => {});
  });
  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  bus.on("check_status_billing", msg => {
    console.log("check_status_billing", msg.billing_no);
    let sqlItem =
      "SELECT bi.billing_no,br.booking_status FROM billing_item_test bi LEFT Join billing_receiver_info_test br on bi.tracking =br.tracking "+
      "WHERE bi.billing_no=? and (br.status != 'cancel' or br.status is null)";
    let data = [msg.billing_no];
    connection.query(sqlItem, data, (err, results) => {
      if (err === null) {
        if (results.length > 0) {
          var c_pass = true;
          for (i = 0; i < results.length; i++) {
            if (results[i].booking_status == 5) {
              c_pass = false;
            }
          }

          if (c_pass) {
            bus.emit("update_booked", results[0].billing_no);
          }
        }
      }
    });
  });
  bus.on("update_booked", msg => {
    console.log(msg);
    var billing_no = msg;
    let sqlBilling = "UPDATE billing_test SET status=? WHERE billing_no=?";
    let data = ["booked", billing_no];
    connection.query(sqlBilling, data, (err, results) => {});
  });
};
