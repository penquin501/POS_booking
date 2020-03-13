const connection = require("../env/db");
const request = require("request");

const moment = require("moment");
const momentTimezone = require("moment-timezone");

module.exports = bus => {
  bus.on("booking", msg => {
    var billing_no = msg;
    console.log("booking....", billing_no);

    let updateBilling = "UPDATE billing SET status=? WHERE billing_no=?";
    let data = ["booking", billing_no];
    connection.query(updateBilling, data, (err, results) => {
      if (results.affectedRows > 0) {
        bus.emit("pick_box", billing_no);
      }
    });
  });
  bus.on("pick_box", msg => {
    console.log("picking....", msg);
    var billing_no = msg;

    let sqlItem =
      "SELECT bi.billing_no,bi.tracking,bi.size_id,bi.parcel_type as bi_parcel_type,bi.cod_value,br.receiver_name,br.phone,br.receiver_address," +
      "d.DISTRICT_NAME,a.AMPHUR_NAME,p.PROVINCE_NAME,br.zipcode,s.sold_to_account_id,s.pickup_account_id,s.customer_account_id " +
      "FROM billing_item bi " +
      "LEFT JOIN billing_receiver_info br ON bi.tracking=br.tracking " +
      "LEFT JOIN postinfo_district d ON br.district_id=d.DISTRICT_ID AND br.amphur_id=d.AMPHUR_ID AND br.province_id=d.PROVINCE_ID " +
      "LEFT JOIN postinfo_amphur a ON br.amphur_id=a.AMPHUR_ID " +
      "LEFT JOIN postinfo_province p ON br.province_id=p.PROVINCE_ID " +
      "LEFT JOIN size_info s ON bi.size_id=s.size_id " +
      "WHERE bi.billing_no=? AND (br.status != 'cancel' or status is null)";
    let data = [billing_no];
    connection.query(sqlItem, data, (err, results) => {
      // console.log(results);
      for (i = 0; i < results.length; i++) {
        var info = {
          data: results[i]
        };
        bus.emit("get_token", info);
      }
    });
  });
  bus.on("get_token", msg => {
    console.log("get_token", msg);
    request(
      {
        url: PROCESS_GET_TOKEN,
        method: "POST",
        headers: {
          apikey: APIKEY
        },
        json: true
      },
      (err, res, body) => {
        var info = {
          token: res.body,
          data: msg
        };
        bus.emit("set_json", info);
      }
    );
  });

  bus.on("set_json", msg => {

    let data = msg.data.data;

    let address =
      data.receiver_address +
      " " +
      data.DISTRICT_NAME +
      " " +
      data.AMPHUR_NAME +
      " " +
      data.PROVINCE_NAME;

    var address1 = "";
    var address2 = "";
    var address3 = "";
    let listAddress = [];

    if (address.length > 150) {
      addressSub = address.substring(0, 150);
      address1 = addressSub.substring(0, 60);
      address2 = addressSub.substring(60, 120);
      address3 = addressSub.substring(120, 150);
    } else {
      address1 = address.substring(0, 60);
      address2 = address.substring(60, 120);
      address3 = address.substring(120, 150);
    }
    listAddress.push(address1, address2, address3);
    var dataJsonDHL = {
      manifestRequest: {
        hdr: {
          messageType: "SHIPMENT",
          messageDateTime: momentTimezone(new Date()).tz("Asia/Bangkok"),
          accessToken: msg.token.dhl_token,
          messageVersion: "1.3"
        },
        bd: {
          customerAccountId: parseInt(data.customer_account_id),
          pickupAccountId: data.pickup_account_id,
          soldToAccountId: data.sold_to_account_id,
          shipmentItems: [
            {
              shipmentID: data.tracking,
              totalWeight: 200,
              totalWeightUOM: "g",
              productCode: "PDO",
              // codValue: Math.floor(codValue).toFixed(2),
              currency: "THB",
              consigneeAddress: {
                name: data.receiver_name,
                address1: listAddress[0],
                address2:
                  listAddress[1] in listAddress
                    ? listAddress[1]
                    : data.DISTRICT_NAME,
                address3: listAddress[2] in listAddress ? listAddress[2] : "-",
                state: data.PROVINCE_NAME,
                district: data.AMPHUR_NAME,
                postCode: data.zipcode,
                country: "TH",
                phone: data.phone
              }
            }
          ]
        }
      }
    };
    if (data.bi_parcel_type == "COD") {
      dataJsonDHL.manifestRequest.bd.shipmentItems[0].codValue = Math.floor(
        data.cod_value
      ).toFixed(2);
    }

    var info = {
      tracking: data.tracking,
      data: dataJsonDHL
    };
    bus.emit("send_api", info);
    bus.emit("response_log", info);
  });

  bus.on("response_log", msg => {
    console.log("response_log %s", msg.tracking);
    let trackingBatch =
      "INSERT INTO booking_tracking_batch(tracking, status, send_record_at, prepare_json) VALUES (?, ?, ?, ?)";
    let data = [msg.tracking, "booking", new Date(), JSON.stringify(msg.data)];
    connection.query(trackingBatch, data, (err, results) => {});
  });

  bus.on("send_api", msg => {
    console.log("send_api", msg.tracking);

    var data = {};
    request(
      {
        // url: DHL_API,
        url: DHL_API_TEST,
        method: "POST",
        body: msg.data,
        json: true
      },
      (err, res, body) => {
        if (err === null) {
          if (res.statusCode == 200) {
            data = {
              status: "pass",
              result: res.body,
              tracking: msg.tracking
            };
          } else {
            data = {
              status: "uncertain",
              result: res.body,
              tracking: msg.tracking
            };
          }
        } else {
          data = {
            status: "error",
            result: err.code,
            tracking: msg.tracking
          };
        }

        bus.emit("response", data);
        // bus.emit("response_log", data);
      }
    );
  });

  bus.on("response", msg => {
    // console.log("response", JSON.stringify(msg));
    var responseCode = msg.result.manifestResponse.bd.responseStatus.code;
    var responseMessage = msg.result.manifestResponse.bd.responseStatus.message;

    var booking_status = 0;

    if (msg.status == "pass") {
      if (responseCode == 200 && responseMessage == "SUCCESS") {
        booking_status = 100;
      } else {
        booking_status = 5;
      }
    } else {
      booking_status = 5;
    }
    if (booking_status === 100) {
      let updateReceiver =
        "UPDATE billing_receiver_info SET booking_status=?,booking_date=? WHERE tracking=?";
      let dataReceiver = [booking_status, new Date(), msg.tracking];
      connection.query(updateReceiver, dataReceiver, (err, results) => {});
    }

    let updateBookingBatch =
      "UPDATE booking_tracking_batch SET status=?,response_record_at=?,res_json=? WHERE tracking=? AND status=?";
    let dataBookingBatch = [responseMessage,new Date(),JSON.stringify(msg.result),msg.tracking,"booking"];
    connection.query(updateBookingBatch, dataBookingBatch, (err, results) => {});
  });
};
