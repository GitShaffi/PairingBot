const http = require('http');
const fs = require('fs');
const url = require('url');
const os = require('os');

class Server {

 constructor() {
    this.port = 8081;
    this.uiPath = 'ui/pairing-chord.html';

    const interfaces = os.networkInterfaces();
    let addresses = [];
    for (let k in interfaces) {
        for (let k2 in interfaces[k]) {
            let address = interfaces[k][k2];
            if (address.family === 'IPv4' && !address.internal) {
                addresses.push(address.address);
            }
        }
    }
    addresses.push('127.0.0.1');
    this.host = addresses.shift();
 }
 
 getStatsUrl() {
     
    // return `http://${this.host}:${this.port}/${this.uiPath}`
 }

 start() {
   http.createServer( (request, response) => {  
        var pathname = url.parse(request.url).pathname;
        console.log(__dirname);
        console.log("Request for " + pathname.substr(1) + " received.");
        
        fs.readFile(pathname.substr(1), function (err, data) {
            if (err) {
                console.log(err);
                response.writeHead(404, {'Content-Type': 'text/html'});
            } else {	
                response.writeHead(200, {'Content-Type': 'text/html'});	
                response.write(data.toString());		
            }
            response.end();
        });   
    }).listen(this.port);

    console.log(`Server running at http://${this.host}:${this.port}/`);
  }
}

module.exports = Server;