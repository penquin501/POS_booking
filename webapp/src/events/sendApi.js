const connection = require("../env/db");
const request = require("request");

const moment = require("moment");
const momentTimezone = require("moment-timezone");

module.exports = bus => {
  bus.on("booking", msg => {
    var billing_no = msg;
    console.log("booking....", billing_no);

    let updateBilling = "UPDATE billing_test SET status=? WHERE billing_no=?";
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
      "SELECT bi.billing_no,bi.tracking,bi.size_id,bi.parcel_type,bi.cod_value,br.receiver_name,br.phone,br.receiver_address," +
      "d.DISTRICT_NAME,a.AMPHUR_NAME,p.PROVINCE_NAME,z.zipcode,s.sold_to_account_id,s.pickup_account_id,s.customer_account_id " +
      "FROM billing_item_test bi " +
      "LEFT JOIN billing_receiver_info_test br ON bi.tracking=br.tracking " +
      "LEFT JOIN postinfo_district d ON br.district_id=d.DISTRICT_ID AND br.amphur_id=d.AMPHUR_ID AND br.province_id=d.PROVINCE_ID " +
      "LEFT JOIN postinfo_amphur a ON d.amphur_id=a.AMPHUR_ID " +
      "LEFT JOIN postinfo_province p ON d.province_id=p.PROVINCE_ID " +
      "LEFT JOIN postinfo_zipcodes z ON d.DISTRICT_CODE=z.district_code " +
      "LEFT JOIN size_info s ON bi.size_id=s.size_id " +
      "WHERE bi.billing_no=? AND (br.status != 'cancel' or status is null)";
    let data = [billing_no];
    connection.query(sqlItem, data, (err, results) => {
      console.log(results);
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
    console.log("set_json", msg.data.data);

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

    if (address.length < 60) {
      for (i = 0; i < address.length; i++) {
        address1 += address[i];
      }
      listAddress.push(address1);
    } else {
      if (address.length - 60 < 60) {
        for (i = 0; i < 60; i++) {
          address1 += address[i];
        }
        listAddress.push(address1);

        for (j = 0; j < address.length - address1.length; j++) {
          address2 += address[j + 60];
        }
        listAddress.push(address2);
      } else {
        if (address.length - 120 < 30) {
          for (i = 0; i < 60; i++) {
            address1 += address[i];
          }
          listAddress.push(address1);

          for (j = 0; j < 60; j++) {
            address2 += address[j + 60];
          }
          listAddress.push(address2);

          for (
            k = 0;
            k < address.length - (address1.length + address2.length);
            k++
          ) {
            address3 += address[k + 120];
          }
          listAddress.push(address3);
        } else {
          for (i = 0; i < 60; i++) {
            address1 += address[i];
          }
          listAddress.push(address1);

          for (j = 0; j < 60; j++) {
            address2 += address[j + 60];
          }
          listAddress.push(address2);

          for (k = 0; k < 30; k++) {
            address3 += address[k + 120];
          }
          listAddress.push(address3);
        }
      }
    }
    var dataJsonDHL ={};
    if(data.bi_parcel_type == "COD") {
        dataJsonDHL = {
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
                    codValue: Math.floor(codValue).toFixed(2),
                    currency: "THB",
                    consigneeAddress: {
                      name: data.receiver_name,
                      address1: listAddress[0],
                      address2: listAddress[1] in listAddress ? listAddress[1] : data.DISTRICT_NAME,
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
    } else {
        dataJsonDHL = {
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
                    // codValue: data.bi_parcel_type == "COD"? Math.floor(codValue).toFixed(2): 0.00,
                    currency: "THB",
                    consigneeAddress: {
                      name: data.receiver_name,
                      address1: listAddress[0],
                      address2: listAddress[1] in listAddress ? listAddress[1] : data.DISTRICT_NAME,
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
    }

    var info={
        tracking:data.tracking,
        data:dataJsonDHL
    }
    bus.emit("send_api", info);
  });

  bus.on("send_api", msg => {
    console.log("send_api", JSON.stringify(msg));
    bus.emit("prepare_json", msg.data);
    // var tracking = msg.tracking;
    var data={};
    request(
      {
        url: "https://api.dhlecommerce.dhl.com/rest/v3/Shipment",
        method: "POST",
        body: msg.data,
        json: true
      },
      (err, res, body) => {
        console.log(res.body);
        
        if (err === null) {
          if (res.statusCode == 200) {
            data = {
              status:'pass',
              result: res.body,
              tracking: msg.tracking
            };
          } else {
            data = {
              status:'uncertain',
              result: res.body,
              tracking: msg.tracking
            };
          }
        } else {
            data = {
                status:'error',
                result: err.code,
                tracking: msg.tracking
              };
              
        }
        bus.emit("response", data);
      }
    );
  });
  bus.on("response", msg => {
    console.log("response_success", msg.result);
    let trackingBatch = "UPDATE booking_tracking_batch SET status=?,response_record_at=?,res_json=? WHERE tracking=?";
    let data = [msg.status, new Date(), JSON.stringify(msg.result),msg.tracking];
    connection.query(trackingBatch, data, (err, results) => {});
  });
  bus.on("prepare_json", msg => {
    console.log("prepare_json", msg.result);
    let trackingBatch = "INSERT INTO booking_tracking_batch(tracking, status, send_record_at, prepare_json) VALUES (?, ?, ?, ?)";
    let data = [msg.tracking, 'send api', new Date(), JSON.stringify(msg.data)];
    connection.query(trackingBatch, data, (err, results) => {});
  });
};
