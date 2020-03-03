var mysql = require('mysql');
var connection = mysql.createPool({
    connectionLimit : 10,
    host: '178.128.80.22',
    user: 'parceldev',
    password: '123456',
    database: 'parcel',
    // host: '178.128.80.22',
    // user: 'admin',
    // password: '4a04047f35404a37b150bc21e69de4c6',
    // database: 'parcel',
    debug : false,
    timezone : '+07:00'
});
console.log("DB INIT");
// connection.connect();

module.exports = connection;