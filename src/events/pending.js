const connection = require("../env/db");
const momentTimezone = require("moment-timezone");

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
  bus.on("check_data", msg => {
    console.log("check_data", msg);
    var billing_no = msg;

    var sqlBilling =
      "SELECT user_id,mer_authen_level,member_code,carrier_id,billing_no,branch_id,img_url FROM billing WHERE billing_no= ?";
    var dataBilling = [billing_no];

    let sqlItem =
      "SELECT bItem.tracking,bItem.size_price,bItem.parcel_type as bi_parcel_type,bItem.zipcode as bi_zipcode,bItem.cod_value," +
      "br.sender_name,br.sender_phone,br.sender_address,br.receiver_name,br.phone,br.receiver_address," +
      "d.DISTRICT_CODE,d.DISTRICT_NAME,a.AMPHUR_CODE,a.AMPHUR_NAME,p.PROVINCE_CODE,p.PROVINCE_NAME,br.zipcode as br_zipcode,br.parcel_type as br_parcel_type,br.remark," +
      "s.alias_size,gSize.product_id,gSize.product_name,g.GEO_ID,g.GEO_NAME " +
      "FROM billing_item bItem " +
      "LEFT JOIN billing_receiver_info br ON bItem.tracking=br.tracking " +
      "LEFT JOIN size_info s ON bItem.size_id=s.size_id " +
      "LEFT JOIN global_parcel_size gSize ON s.location_zone = gSize.area AND s.alias_size =gSize.alias_name AND bItem.parcel_type= gSize.type " +
      "LEFT JOIN postinfo_district d ON br.district_id=d.DISTRICT_ID AND br.amphur_id=d.AMPHUR_ID and br.province_id=d.PROVINCE_ID " +
      "LEFT JOIN postinfo_amphur a ON br.amphur_id=a.AMPHUR_ID " +
      "LEFT JOIN postinfo_province p ON br.province_id=p.PROVINCE_ID " +
      "LEFT JOIN postinfo_geography g ON d.GEO_ID=g.GEO_ID " +
      "WHERE bItem.billing_no=? AND (br.status != 'cancel' or br.status is null)";
    var dataItem = [billing_no];

    connection.query(sqlBilling, dataBilling, function(err, resultBilling) {
      if (resultBilling.length > 0) {
        connection.query(sqlItem, dataItem, (err, resultsItem) => {
          if (err === null) {
            if (resultsItem.length > 0) {
              var check_item_pass = true;

              for (i = 0; i < resultsItem.length; i++) {
                if (resultsItem[i].tracking === null) {
                  console.log("tracking null",resultsItem[i].tracking);
                  check_item_pass = false;
                }
                if (resultsItem[i].bi_zipcode === null) {
                  console.log("bi_zipcode null",resultsItem[i].tracking);
                  check_item_pass = false;
                }
                if (resultsItem[i].size_id === null) {
                  console.log("size_id null",resultsItem[i].tracking);
                  check_item_pass = false;
                }
                if (resultsItem[i].bi_parcel_type === null) {
                  console.log("bi_parcel_type null",resultsItem[i].tracking);
                  check_item_pass = false;
                }
                if (resultsItem[i].cod_value === null) {
                  console.log("cod_value null",resultsItem[i].tracking);
                  check_item_pass = false;
                }
                if (resultsItem[i].br_parcel_type === null) {
                  console.log("br_parcel_type null",resultsItem[i].tracking);
                  check_item_pass = false;
                }
                if (resultsItem[i].receiver_name === null) {
                  console.log("receiver_name null",resultsItem[i].tracking);
                  check_item_pass = false;
                }
                if (resultsItem[i].phone === null) {
                  console.log("phone null",resultsItem[i].tracking);
                  check_item_pass = false;
                }
                if (resultsItem[i].receiver_address === null) {
                  console.log("receiver_address null",resultsItem[i].tracking);
                  check_item_pass = false;
                }
                if (resultsItem[i].DISTRICT_NAME === null) {
                  console.log("DISTRICT_NAME null",resultsItem[i].tracking);
                  check_item_pass = false;
                }
                if (resultsItem[i].AMPHUR_NAME === null) {
                  console.log("AMPHUR_NAME null",resultsItem[i].tracking);
                  check_item_pass = false;
                }
                if (resultsItem[i].PROVINCE_NAME === null) {
                  console.log("PROVINCE_NAME null",resultsItem[i].tracking);
                  check_item_pass = false;
                }
                if (resultsItem[i].br_zipcode === null) {
                  console.log("zipcode null",resultsItem[i].tracking);
                  check_item_pass = false;
                }
                if (resultsItem[i].bi_zipcode !== resultsItem[i].br_zipcode) {
                  console.log("zipcode not match",resultsItem[i].tracking);
                  check_item_pass = false;
                }
                if (
                  resultsItem[i].bi_parcel_type !==
                  resultsItem[i].br_parcel_type
                ) {
                  console.log("type not match",resultsItem[i].tracking);
                  check_item_pass = false;
                }

                if (
                  resultsItem[i].bi_parcel_type === "NORMAL" && resultsItem[i].cod_value !== 0
                ) {
                  console.log("cod value incorrect",resultsItem[i].tracking);
                  check_item_pass = false;
                }

                if (
                  resultsItem[i].bi_parcel_type === "COD" && resultsItem[i].cod_value === 0
                ) {
                  console.log("cod value incorrect",resultsItem[i].tracking);
                  check_item_pass = false;
                }
              }

              var check_pass = true;

              if (resultBilling[0].user_id === null) {
                console.log("user_id null",resultBilling[i].billing_no);
                check_pass = false;
              }
              if (resultBilling[0].mer_authen_level === null) {
                console.log("mer_authen_level null",resultBilling[i].billing_no);
                check_pass = false;
              }
              if (resultBilling[0].member_code === null) {
                console.log("member_code null",resultBilling[i].billing_no);
                check_pass = false;
              }
              if (resultBilling[0].carrier_id === null) {
                console.log("carrier_id null",resultBilling[i].billing_no);
                check_pass = false;
              }
              if (resultBilling[0].img_url === null) {
                console.log("img_url null",resultBilling[i].billing_no);
                check_pass = false;
              }
              if (resultBilling[0].branch_id === null) {
                console.log("branch_id null",resultBilling[i].billing_no);
                check_pass = false;
              }
              if (resultBilling[0].billing_no === null) {
                console.log("billing_no null",resultBilling[i].billing_no);
                check_pass = false;
              }
              console.log("%s ----- %s",check_pass,check_item_pass);
              if (check_pass && check_item_pass) {
                bus.emit("set_ready", resultBilling[0].billing_no);
              } else {
                bus.emit("set_back_complete", resultBilling[0].billing_no);
              }
            }
          } else {
            console.log(err);
          }
        });
      }
    });
  });
  bus.on("set_ready", msg => {
    console.log("set_ready", msg);
    let updateBilling = "UPDATE billing SET status=? WHERE billing_no=?";
    let data = ["ready", msg];
    connection.query(updateBilling, data, (err, results) => {});
  });
  bus.on("set_back_complete", msg => {
    console.log("set_back_complete", msg);
    let updateBilling = "UPDATE billing SET status=? WHERE billing_no=?";
    let data = ["complete", msg];
    connection.query(updateBilling, data, (err, results) => {});
  });
};
