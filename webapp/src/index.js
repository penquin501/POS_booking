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

app.get("/confirm-booking", function(req, res) {
  let status = "confirm";
  let list_billing = req.body.list_billing;

  parcelServices.saveBatch(status);

  for (i = 0; i < list_billing.length; i++) {
    parcelServices.updateConfirm(status, list_billing[i].billing_no).then(function(result) {});
  }

  res.send("ok");
});

app.get("/excelpath", function(req, res) {
  
  var wb = new xl.Workbook();
  var ws = wb.addWorksheet("Sheet 1");

  // ws.cell(1, 1).number(100);
  // ws.cell(1, 2).string("some text");
  // ws.cell(1, 3).formula("A1+A2");
  // ws.cell(1, 4).bool(true);

  ws.cell(1, 1).string("some text1");
  ws.cell(1, 2).string("some text2");

  var data = [
    {
      key: "a",
      val: 1
    },
    {
      key: "b",
      val: 2
    },
    {
      key: "c",
      val: 3
    }
  ];
  for (i = 0; i < data.length; i++) {
    ws.cell(i + 2, 1).string(data[i].key);
    ws.cell(i + 2, 2).number(data[i].val);
  }

  wb.write("myfirstexcel.xlsx");
  res.end("success");
  // wb.write("ExcelFile.xlsx", res);

  // res.json({ hello: "World" });
});

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
      for(i=0;i<data.length;i++){
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
      for(i=0;i<data.length;i++){
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
      for(i=0;i<data.length;i++){
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
