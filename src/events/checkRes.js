const connection = require("../env/db");
const request = require("request");

const moment = require("moment");
const momentTimezone = require("moment-timezone");

module.exports = bus => {
  bus.on("check_status_billing", msg => {
    console.log("check_status_billing", msg.billing_no);
    let sqlItem =
      "SELECT bi.billing_no,br.booking_status FROM billing_item bi LEFT Join billing_receiver_info br on bi.tracking =br.tracking "+
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
            if (results[i].booking_status == null) {
              c_pass = false;
            }
          }

          if (c_pass) {
            bus.emit("update_booked", results[0].billing_no);
          } else {
            bus.emit("update_default_state", results[0].billing_no);
          }
        }
      }
    });
  });
  bus.on("update_booked", msg => {
    console.log("update_booked=>",msg);
    var billing_no = msg;
    let sqlBilling = "UPDATE billing SET status=? WHERE billing_no=? AND status=?";
    let data = ["booked", billing_no,"checking"];
    connection.query(sqlBilling, data, (err, results) => {});
  });
  bus.on("update_default_state", msg => {
    console.log("update_default_state=>",msg);
    var billing_no = msg;
    let sqlBilling = "UPDATE billing SET status=? WHERE billing_no=? AND status=?";
    let data = ["complete", billing_no,"checking"];
    connection.query(sqlBilling, data, (err, results) => {});
  });
};
