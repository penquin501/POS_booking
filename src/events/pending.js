const connection = require("../env/db");
const momentTimezone = require("moment-timezone");
const request = require("request");

module.exports = bus => {
  bus.on("prepare_check_data", msg => {
    console.log("checking....", msg.billingNo);

    let updateBilling = "UPDATE billing SET status=? WHERE billing_no=?";
    let data = ["checking", msg.billingNo];
    connection.query(updateBilling, data, (err, results) => {
      if (results.affectedRows > 0) {
        bus.emit("check_data", msg.billingNo);
      }
    });
  });

  function isGenericValid(data, key, defaultValue, resultList = null, check_tracking) {
    var out = [];
    if (resultList != null) {
      out = resultList;
    }
    if (data[key] == "") {
      // out.push("" + check_tracking + " empty");
      console.log("" + check_tracking + " empty");
      return false;
    }
    if (data[key] == null) {
      // out.push("" + check_tracking + " missing");
      console.log("" + check_tracking + " missing");
      return false;
    }

    // console.log(out);

    return defaultValue;
  }

  function isMatched(defaultValue,bi_type,br_type,bi_zipcode,br_zipcode,cod_value,resultList = null,check_tracking){
    console.log("testttttt",defaultValue,bi_zipcode,br_zipcode,check_tracking);
    var out = [];
    if (resultList != null) {
      out = resultList;
    }

    if (bi_type == "NORMAL" && cod_value !== 0) {
      console.log("" + check_tracking + " cod_value wrong");
      // out.push("" + check_tracking + " cod_value wrong");
      return false;
    }

    if (bi_type == "COD" && cod_value == 0) {
      console.log("" + check_tracking + " cod_value wrong");
      // out.push("" + check_tracking + " cod_value wrong");
      return false;
    }

    if (bi_type !== br_type) {
      console.log("" + check_tracking + " type not match");
      // out.push("" + check_tracking + " type not match");
      return false;
    }

    if (bi_zipcode !== br_zipcode) {
      console.log("" + check_tracking + " zipcode not match");
      // out.push("" + check_tracking + " zipcode not match");
      return false;
    } 
      return defaultValue;
  }

  bus.on("check_data", msg => {
    console.log("check_data", msg);
    var billing_no = msg;

    var sqlBilling =
      "SELECT user_id,mer_authen_level,member_code,carrier_id,billing_no,branch_id,img_url FROM billing WHERE billing_no= ?";
    var dataBilling = [billing_no];

    let sqlItem =
      "SELECT bItem.tracking,bItem.size_id,bItem.size_price,bItem.parcel_type as bi_parcel_type,bItem.zipcode as bi_zipcode,bItem.cod_value," +
      "br.sender_name,br.sender_phone,br.sender_address,br.receiver_name,br.phone,br.receiver_address," +
      "d.DISTRICT_CODE,d.DISTRICT_NAME,a.AMPHUR_CODE,a.AMPHUR_NAME,p.PROVINCE_CODE,p.PROVINCE_NAME,br.zipcode as br_zipcode,br.parcel_type as br_parcel_type,br.remark," +
      "s.alias_size,g.GEO_ID,g.GEO_NAME,s.sold_to_account_id,s.pickup_account_id,s.customer_account_id " +
      "FROM billing_item bItem " +
      "LEFT JOIN billing_receiver_info br ON bItem.tracking=br.tracking " +
      "LEFT JOIN size_info s ON bItem.size_id=s.size_id " +
      "LEFT JOIN postinfo_district d ON br.district_id=d.DISTRICT_ID AND br.amphur_id=d.AMPHUR_ID and br.province_id=d.PROVINCE_ID " +
      "LEFT JOIN postinfo_amphur a ON br.amphur_id=a.AMPHUR_ID " +
      "LEFT JOIN postinfo_province p ON br.province_id=p.PROVINCE_ID " +
      "LEFT JOIN postinfo_geography g ON d.GEO_ID=g.GEO_ID " +
      "WHERE bItem.billing_no=? AND (br.status != 'cancel' or br.status is null) AND (br.booking_status != 100 OR br.booking_status is null)";
    var dataItem = [billing_no];

    connection.query(sqlBilling, dataBilling, function(err, resultBilling) {
      if (resultBilling.length > 0) {
        connection.query(sqlItem, dataItem, (err, resultsItem) => {
          console.log(err);
          if (resultsItem.length > 0) {
            
            var resultList = [];
            for (i = 0; i < resultsItem.length; i++) {
              var valid = true;
              valid = isGenericValid(resultsItem[i],"tracking", valid, resultList,resultsItem[i].tracking);
              valid = isGenericValid(resultsItem[i],"size_price",valid,resultList,resultsItem[i].tracking);
              valid = isGenericValid(resultsItem[i],"bi_parcel_type",valid,resultList,resultsItem[i].tracking);
              valid = isGenericValid(resultsItem[i],"bi_zipcode",valid,resultList,resultsItem[i].tracking);
              valid = isGenericValid(resultsItem[i],"sender_name",valid,resultList,resultsItem[i].tracking);
              valid = isGenericValid(resultsItem[i],"sender_phone",valid,resultList,resultsItem[i].tracking);
              valid = isGenericValid(resultsItem[i],"sender_address",valid,resultList,resultsItem[i].tracking);
              valid = isGenericValid(resultsItem[i],"receiver_name",valid,resultList,resultsItem[i].tracking);
              valid = isGenericValid(resultsItem[i],"phone",valid,resultList,resultsItem[i].tracking);
              valid = isGenericValid(resultsItem[i],"receiver_address",valid,resultList,resultsItem[i].tracking);
              valid = isGenericValid(resultsItem[i],"DISTRICT_NAME",valid,resultList,resultsItem[i].tracking);
              valid = isGenericValid(resultsItem[i],"AMPHUR_NAME",valid,resultList,resultsItem[i].tracking);
              valid = isGenericValid(resultsItem[i],"PROVINCE_NAME",valid,resultList,resultsItem[i].tracking);
              valid = isGenericValid(resultsItem[i],"br_zipcode",valid,resultList,resultsItem[i].tracking);
              valid = isGenericValid(resultsItem[i],"br_parcel_type",valid,resultList,resultsItem[i].tracking);

              valid = isMatched(valid,resultsItem[i].bi_parcel_type,resultsItem[i].br_parcel_type,resultsItem[i].bi_zipcode,resultsItem[i].br_zipcode,resultsItem[i].cod_value,resultList,resultsItem[i].tracking);

              console.log("valid %s ===>%s",resultsItem[i].tracking, valid);
              if (valid) {
                bus.emit("set_item_ready", resultsItem[i]);
              }
            }
          }
        });
      }
    });
  });

  bus.on("set_item_ready", msg => {
    console.log("set_Item_ready", msg.tracking);
    let tracking = msg.tracking;
    let updateReceiver = "UPDATE billing_receiver_info SET status=? WHERE tracking=?";
    let data = ["ready", tracking];
    connection.query(updateReceiver, data, (err, results) => {
      if(results.affectedRows > 0){
        bus.emit("get_token", msg);
      }
    });
  });

  bus.on("get_token", msg => {
    // console.log("get_token", msg);
    request(
      {
        url:
          "https://www.945holding.com/webservice/restful/3thparty/dhl/v11/gettoken",
        method: "POST",
        headers: {
          apikey: "XbOiHrrpH8aQXObcWj69XAom1b0ac5eda2b"
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
    console.log("set_json", msg.data.tracking);

    let data = msg.data;

    let address = data.receiver_address + " " + data.DISTRICT_NAME + " " + data.AMPHUR_NAME + " " + data.PROVINCE_NAME;

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
      dataJsonDHL.manifestRequest.bd.shipmentItems[0].codValue = Math.floor(data.cod_value).toFixed(2);
    }
    // console.log(JSON.stringify(dataJsonDHL));
    var info = {
      tracking: data.tracking,
      data: dataJsonDHL
    };

    // console.log(JSON.stringify(info));
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
        // url: "https://api.dhlecommerce.dhl.com/rest/v3/Shipment",
        url: "https://tool-uat.945parcel.com/test-dhl-response",
        method: "POST",
        body: msg.data,
        json: true
      },
      (err, res, body) => {
        if (err === null) {
          console.log(res.statusCode);
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
        // console.log("test", JSON.stringify(res.body));
        bus.emit("response", data);
        // bus.emit("response_log", data);
      }
    );
  });

  bus.on("response", msg => {
    console.log("response", msg.tracking);
    var responseCode = msg.result.manifestResponse.bd.responseStatus.code;
    var responseMessage = msg.result.manifestResponse.bd.responseStatus.message;
    // console.log("responseCode %s ====> %s", msg.tracking, responseCode);
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
        "UPDATE billing_receiver_info SET status=?,booking_status=?,booking_date=? WHERE tracking=?";
      let dataReceiver = ['booked',booking_status, new Date(), msg.tracking];
      connection.query(updateReceiver, dataReceiver, (err, results) => {});
    }

    let updateBookingBatch =
      "UPDATE booking_tracking_batch SET status=?,response_record_at=?,res_json=? WHERE tracking=? AND status=?";
    let dataBookingBatch = [responseMessage,new Date(),JSON.stringify(msg.result),msg.tracking,"booking"];
    connection.query(updateBookingBatch, dataBookingBatch, (err, results) => {});
  });
};
