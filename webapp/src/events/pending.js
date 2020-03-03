const connection = require("../env/db");
const momentTimezone = require("moment-timezone");

module.exports = bus => {
  bus.on("prepare_check_data", msg=>{
    console.log("checking....",msg.billingNo);

    let updateBilling = "UPDATE billing SET status=? WHERE billing_no=?";
    let data = ['checking', msg.billingNo];
    connection.query(updateBilling, data, (err, results) => {
      
      if(results.affectedRows>0){
        bus.emit("check_data", msg.billingNo);
      }
    });
  });
  bus.on("check_data",msg => {
    console.log("check_data",msg);
    var billing_no=msg;
    var sqlItem =
      "SELECT bi.billing_no,bi.tracking,bi.zipcode as bi_zipcode,bi.size_id,bi.parcel_type as bi_type,bi.cod_value,br.parcel_type as br_type,br.receiver_name,br.phone,br.receiver_address," +
      "d.DISTRICT_NAME,a.AMPHUR_NAME,p.PROVINCE_NAME,z.zipcode " +
      "FROM billing_item bi " +
      "LEFT JOIN billing_receiver_info br ON bi.tracking=br.tracking " +
      "LEFT JOIN postinfo_district d ON br.district_id=d.DISTRICT_ID AND br.amphur_id=d.AMPHUR_ID AND br.province_id=d.PROVINCE_ID " +
      "LEFT JOIN postinfo_amphur a ON d.amphur_id=a.AMPHUR_ID " +
      "LEFT JOIN postinfo_province p ON d.province_id=p.PROVINCE_ID " +
      "LEFT JOIN postinfo_zipcodes z ON d.DISTRICT_CODE=z.district_code " +
      "WHERE bi.billing_no=? AND (br.status != 'cancel' or br.status is null)";
    var data = [billing_no];
    connection.query(sqlItem, data, (err, resultsItem) => {
      if (resultsItem.length > 0) {
        var check_item_pass=true;

        for (i = 0; i < resultsItem.length; i++) {
          if(resultsItem[i].tracking === null){
            check_item_pass=false;
          } 
          if (resultsItem[i].bi_zipcode === null) {
            check_item_pass=false;
          } 
          if (resultsItem[i].size_id === null) {
            check_item_pass=false;
          } 
          if (resultsItem[i].bi_type === null) {
            check_item_pass=false;
          } 
          if (resultsItem[i].cod_value === null) {
            check_item_pass=false;
          } 
          if (resultsItem[i].br_type === null) {
            check_item_pass=false;
          } 
          if (resultsItem[i].receiver_name === null) {
            check_item_pass=false;
          } 
          if (resultsItem[i].phone === null) {
            check_item_pass=false;
          } 
          if (resultsItem[i].receiver_address === null) {
            check_item_pass=false;
          } else if (resultsItem[i].DISTRICT_NAME === null) {
            check_item_pass=false;
          } 
          if (resultsItem[i].AMPHUR_NAME === null) {
            check_item_pass=false;
          } 
          if (resultsItem[i].PROVINCE_NAME === null) {
            check_item_pass=false;
          } 
          if (resultsItem[i].zipcode === null) {
            check_item_pass=false;
          } 
          if (resultsItem[i].bi_zipcode !== resultsItem[i].zipcode) {
            check_item_pass=false;
          } 
          if (resultsItem[i].bi_type !== resultsItem[i].br_type) {
            check_item_pass=false;
          } 
        }

        if(check_item_pass){
          bus.emit("set_ready", resultsItem[0].billing_no);
        } else {
          bus.emit("set_back_complete", resultsItem[0].billing_no);
        }
      }
    })
  });
  bus.on("set_ready",msg=>{
    console.log("set_ready", msg);
    let updateBilling = "UPDATE billing SET status=? WHERE billing_no=?";
    let data = ['ready', msg];
    connection.query(updateBilling, data, (err, results) => {});
  });
  bus.on("set_back_complete",msg=>{
    console.log("set_back_complete", msg);
    let updateBilling = "UPDATE billing SET status=? WHERE billing_no=?";
    let data = ['complete', msg];
    connection.query(updateBilling, data, (err, results) => {});
  });
};
