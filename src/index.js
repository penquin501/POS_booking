require('dotenv').config()
const express = require("express");
const request = require("request");

var xl = require("excel4node");
var mailer = require("nodemailer");

const path = require("path");
const app = express();
const moment = require("moment");
const momentTimezone = require("moment-timezone");
var events = require("events");

const port = process.env.PORT || 3200;

moment.locale("th");
app.use(express.json());
app.use(express.static("public"));
var bus = new events.EventEmitter();
var bus2 = new events.EventEmitter();
var bus3 = new events.EventEmitter();

const parcelServices = require("./services/parcelServices.js");
require("./events/pending.js")(bus);
require("./events/sendApi.js")(bus2);
require("./events/checkRes.js")(bus3);

var smtp = {
  pool: true,
  host: "smtp.gmail.com", //set to your host name or ip
  port: 587, //25, 465, 587 depend on your
  secure: false, // use SSL
  auth: {
    user: "booking@945holding.com", //user account
    pass: "0df8a533a82d162726f3754cfe38a6f1" //user password
  }
};
var smtpTransport = mailer.createTransport(smtp);

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, PATCH, DELETE"
  );
  next();
});

app.get("/new-booking", function(req, res) {
  parcelServices.checkDataPrepare().then(function(listBilling) {
    if (listBilling !== null) {
      res.send(listBilling);
    } else {
      res.send("no data");
    }
  });
});

app.post("/confirm-booking", function(req, res) {
  let status = "confirm";
  let list_billing = req.body.list_billing;

  parcelServices.saveBatch(status);

  for (i = 0; i < list_billing.length; i++) {
    parcelServices.updateConfirm(status, list_billing[i].billing_no).then(function(result) {});
  }

  res.send("ok");
});

app.get("/dhl-excel", function(req, res) {
  var date_now=new Date();
  var current_date = momentTimezone(date_now).tz("Asia/Bangkok").format("YYYY-MM-DD", true);
  var current_date_excel = momentTimezone(date_now).tz("Asia/Bangkok").format("YYMMDDHHmmss", true);
  var random_number = Math.floor(Math.random() * (999 - 111)) + 111;
  var number_parcel = 0;

  var filename =
    "My945_Parcel_TDZ_" + current_date_excel + "_" + random_number + ".xlsx";
  var wb = new xl.Workbook();
  var ws = wb.addWorksheet("945holding_" + current_date);

  const bgStyle = wb.createStyle({
    fill: {
      type: "pattern",
      patternType: "solid",
      bgColor: "#0D701C",
      fgColor: "#0D701C"
    }
  });

  ws.cell(1, 1).string("Customer Confirmation Number").style(bgStyle);
  ws.cell(1, 2).string("Recipient").style(bgStyle);
  ws.cell(1, 3).string("AddressLine1").style(bgStyle);
  ws.cell(1, 4).string("AddressLine2").style(bgStyle);
  ws.cell(1, 5).string("District").style(bgStyle);
  ws.cell(1, 6).string("State").style(bgStyle);
  ws.cell(1, 7).string("Zip").style(bgStyle);
  ws.cell(1, 8).string("Phone").style(bgStyle);
  ws.cell(1, 9).string("COD Amount").style(bgStyle);
  ws.cell(1, 10).string("Insurance Amount").style(bgStyle);
  ws.cell(1, 11).string("Invoice(ref.)").style(bgStyle);

  parcelServices.getBookingLog().then(function(data) {
    number_parcel = data.length;
    for (i = 0; i < data.length; i++) {
      if (data[i].status == "fail") {
        var cellBgStyle = wb.createStyle({
          fill: {
            type: "pattern",
            patternType: "solid",
            bgColor: "#cc0000",
            fgColor: "#cc0000"
          }
        });
      } else {
        if ((i - 1) % 2 == 0) {
          var cellBgStyle = wb.createStyle({
            fill: {
              type: "pattern",
              patternType: "solid",
              bgColor: "#deede3",
              fgColor: "#deede3"
            }
          });
        } else {
          var cellBgStyle = wb.createStyle({
            fill: {
              type: "pattern",
              patternType: "solid",
              bgColor: "#c2e0ed",
              fgColor: "#c2e0ed"
            }
          });
        }
      }
      ws.cell(i + 2, 1).string(data[i].tracking).style(cellBgStyle);
      ws.cell(i + 2, 2).string(data[i].receiver_name).style(cellBgStyle);
      ws.cell(i + 2, 3).string(data[i].receiver_address).style(cellBgStyle);
      ws.cell(i + 2, 4).string("").style(cellBgStyle);
      ws.cell(i + 2, 5).string(data[i].DISTRICT_NAME).style(cellBgStyle);
      ws.cell(i + 2, 6).string(data[i].PROVINCE_NAME).style(cellBgStyle);
      ws.cell(i + 2, 7).string(data[i].zipcode).style(cellBgStyle);
      ws.cell(i + 2, 8).string(data[i].phone).style(cellBgStyle);
      ws.cell(i + 2, 9).number(data[i].cod_value).style(cellBgStyle);
      ws.cell(i + 2, 10).string("").style(cellBgStyle);
      ws.cell(i + 2, 11).string(data[i].billing_no).style(cellBgStyle);
    }
    wb.write(filename);
    // res.end("success");

    var mail = {
      from: "booking@945holding.com", //from email (option)
      to: "penquin501@gmail.com", //to email (require) cs@945holding.com
      subject: "TDZ-My945Parcel-" + current_date + " ", //subject
      html:
        ` &nbsp;Good day DHL team,<br><br>\r\n\r\n&nbsp;&nbsp;&nbsp;This attachment file is My945Parcel(945Holding) booking file for dhl express at ` +
        current_date +
        `<br>\r\n The total number of shipments : ` +
        number_parcel +
        ` pcs. <br>\r\n And so, this mail was generate by automatically system.<br>\r\n&nbsp;&nbsp;&nbsp;If you have any concerned or some question, Please contact to My945Parcel Call Center 0914271551<br><br>\r\n\r\n&nbsp;Best Regards,<br>\r\n&nbsp;945Holding`, //email body
      attachments: [
        {
          filename: filename,
          path: __dirname + "/" + filename
        }
      ]
    };

    smtpTransport.sendMail(mail, function(error, response) {
      smtpTransport.close();
      if (error) {
        //error handler
        console.log("send email error", error);
      } else {
        //success handler
        console.log("send email success");
        res.end("send email success");
      }
    });
  });
});

app.get("/send-email", function(req, res) {
  var mail = {
    from: "booking@945holding.com", //from email (option)
    to: "penquin501@gmail.com", //to email (require)
    subject: "test send mail", //subject
    html: `<p>Test</p>`, //email body
    attachments: [
      {
        filename: "myfirstexcel.xlsx",
        path: __dirname + "/myfirstexcel.xlsx"
      }
    ]
  };

  smtpTransport.sendMail(mail, function(error, response) {
    smtpTransport.close();
    if (error) {
      //error handler
      console.log("send email error", error);
    } else {
      //success handler
      console.log("send email success");
      res.end("send email success");
    }
  });
});

//////////////////////////////////////////////start back-service part/////////////////////////////////////////////////////
///////////////////////////////////////////////checking data to ready/////////////////////////////////////////////////////
var t = 0;
let t_format = "HH:mm:ss.SSS";
var execute_interval = 10 * 1000;
var hot_delay = 1000;
var task_number = 0;
checkData = async t => {
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
};

q_check_prepare_data = async () => {
  let start_time = new Date().getTime();
  //-------------- CODE -----------//
  await checkData();
  //---------------
  let end_time = new Date().getTime();
  let actual_execute_time = end_time - start_time;
  let delay_time = Math.max(execute_interval - actual_execute_time, hot_delay);
  setTimeout(q_check_prepare_data, delay_time);
};
////////////////////////////////////////////////////////send DHL api//////////////////////////////////////////////////////////
sendApi = async t => {
  //---------------
  await parcelServices.prepareRawData().then(function(data) {
    if (data !== null) {
      for (i = 0; i < data.length; i++) {
        bus2.emit("booking", data[i].billing_no);
      }
    }
  });
  //---------------
};

q_send_api = async () => {
  let start_time = new Date().getTime();
  //-------------- CODE -----------//
  await sendApi();
  //---------------
  let end_time = new Date().getTime();
  let actual_execute_time = end_time - start_time;
  let delay_time = Math.max(execute_interval - actual_execute_time, hot_delay);
  setTimeout(q_send_api, delay_time);
};
////////////////////////////////////////////////////////check response//////////////////////////////////////////////////////////
checkResponse = async t => {
  //---------------
  await parcelServices.listResponseNotBooked().then(function(data) {
    // console.log(data);
    if (data !== null) {
      for (i = 0; i < data.length; i++) {
        bus3.emit("check_res", data[i]);
      }
    }
  });
  //---------------
};

q_check_response = async () => {
  let start_time = new Date().getTime();
  //-------------- CODE -----------//
  await checkResponse();
  //---------------
  let end_time = new Date().getTime();
  let actual_execute_time = end_time - start_time;
  let delay_time = Math.max(execute_interval - actual_execute_time, hot_delay);
  setTimeout(q_check_response, delay_time);
};

////////////////////////////////////////////////////////check booked billing//////////////////////////////////////////////////////////
checkStatusBilling = async t => {
  //---------------
  await parcelServices.listBillingNotBooked().then(function(data) {
    // console.log(data);
    if (data !== null) {
      for (i = 0; i < data.length; i++) {
        bus3.emit("check_status_billing", data[i]);
      }
    }
  });
  //---------------
};

q_check_status_billing = async () => {
  let start_time = new Date().getTime();
  //-------------- CODE -----------//
  await checkStatusBilling();
  //---------------
  let end_time = new Date().getTime();
  let actual_execute_time = end_time - start_time;
  let delay_time = Math.max(execute_interval - actual_execute_time, hot_delay);
  setTimeout(q_check_status_billing, delay_time);
};

main = async () => {
  q_check_prepare_data();
  q_send_api();
  q_check_response();
  q_check_status_billing();
};

main();

app.listen(port, () => console.log(`listening on port ${port}!`));
