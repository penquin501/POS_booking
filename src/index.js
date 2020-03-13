require('dotenv').config()
const express = require("express");
const request = require("request");

var xl = require("excel4node");
var mailer = require("nodemailer");

const path = require("path");
const app = express();
const moment = require("moment");
const m = require("moment-timezone");
var events = require("events");

const port = process.env.PORT || 3000;

moment.locale("th");
app.use(express.json());
app.use(express.static("public"));
var bus = new events.EventEmitter();

const parcelServices = require("./services/parcelServices.js");
require("./events/pending.js")(bus);
require("./events/checkRes.js")(bus);

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, PATCH, DELETE"
  );
  next();
});

//////////////////////////////////////////////start back-service part/////////////////////////////////////////////////////
///////////////////////////////////////////////checking data to ready/////////////////////////////////////////////////////
var t = 0;
let t_format = "HH:mm:ss.SSS";
var execute_interval = 10 * 1000;
var hot_delay = 1000;
var task_number = 0;
checkData = async t => {
  console.log("%s   Start execute checkData", m().format(t_format));
  //---------------
  await parcelServices.checkCompleteData().then(function(data) {
    if (data !== null) {
      for (i = 0; i < data.length; i++) {
        value = {
          billingNo: data[i].billing_no
        };
        bus.emit("prepare_check_data", value);
      }
    }
  });
  //---------------
  console.log("%s   End execute checkData", m().format(t_format));
};

q_check_prepare_data = async () => {
  let start_time = new Date().getTime();
  //-------------- CODE -----------//
  await checkData();
  //---------------
  let end_time = new Date().getTime();
  let actual_execute_time = end_time - start_time;
  console.log("%s Actual Execute Time = %d",m().format(t_format),actual_execute_time);
  let delay_time = Math.max(execute_interval - actual_execute_time, hot_delay);
  console.log("%s Delay Time = %d", m().format(t_format), delay_time);
  setTimeout(q_check_prepare_data, delay_time);
};

////////////////////////////////////////////////////////check booked billing//////////////////////////////////////////////////////////
checkStatusBilling = async t => {
  console.log("%s   Start execute checkStatusBilling", m().format(t_format));
  //---------------
  await parcelServices.listBillingNotBooked().then(function(data) {
    // console.log(data);
    if (data !== null) {
      for (i = 0; i < data.length; i++) {
        bus.emit("check_status_billing", data[i]);
      }
    }
  });
  //---------------
  console.log("%s   End execute checkStatusBilling", m().format(t_format));
};

q_check_status_billing = async () => {
  let start_time = new Date().getTime();
  //-------------- CODE -----------//
  await checkStatusBilling();
  //---------------
  let end_time = new Date().getTime();
  let actual_execute_time = end_time - start_time;
  console.log("%s Actual Execute Time = %d",m().format(t_format),actual_execute_time);
  let delay_time = Math.max(execute_interval - actual_execute_time, hot_delay);
  console.log("%s Delay Time = %d", m().format(t_format), delay_time);
  setTimeout(q_check_status_billing, delay_time);
};

main = async () => {
  q_check_prepare_data();
  q_check_status_billing();
};

main();

app.listen(port, () => console.log(`listening on port ${port}!`));
