// global variables

const __dirname = import.meta.dirname;
import {createRequire} from "node:module";
const require = createRequire(import.meta.url);


// global dependancies

const crypto = await import("node:crypto"),
      fs = await import("node:fs"),
      http = await import("node:http"),
      https = await import("node:https");

const cloudflare = await import("cloudflare");

const rethinkdb = require("rethinkdb");


// server functions and variables

var server_configuration = {

    "secure": true,
    "database": {
        
        "app": "rethinkdb",
        "connection_settings": {

            db: "server",
            host: "localhost",
            password: "set your password here",
            port: 28015,
            timeout: 120,
            user: "set your username here"
            
        }
        
    },
    "https": {
        
        key: fs.readFileSync(`${__dirname}/private-key.pem`),
        cert: fs.readFileSync(`${__dirname}/certificate.pem`),
        ecdhCurve: "auto",
        minVersion: "TLSv1",
        maxVersion: "TLSv1.3",
        keepAliveTimeout: 300
        
    },
    "web_pages": {
        
        "public": {
            
            "/": {}
            
        },
        "whitelisted": {
            
            
            
        },
        "banned": {


            
        }
        
    }
    
};

var web_server,
    database_client;

if (server_configuration["database"]["app"] === "RethinkDB") {
    
    database_client = rethinkdb;
    database_client.connect();
    
};

var express_app = express();
express_app.use(function(req, res) {
    
    let request_url = new URL(`https://localhost${req.url}`);
    
    let remote_ip_address_banned = await database_client.db("IP-Addresses").table("banned").contains(req.socket.remoteAddress);
    
    let page_datas = "";
    
    
    if (remote_ip_address_banned) {
        
        page_datas = await database_client.db("Server-Administrator-Pages").table("banned").contains("page");
        page_datas["end"] = null;
        
    };
    
    
    if (!remote_ip_address_banned /* if the IP Address is not banned */ && await database_client.db("Server-Administrator-Pages").table("public").contains(request_url.pathname)) {
        
        page_datas = await database_client.db("Server-Administrator-Pages").table("public").get(request_url.pathname);
        page_datas["end"] = null;
        
    };
    if (!remote_ip_address_banned && await database_client.db("Server-Administrator-Pages").table("public-api").contains(request_url.pathname)) {
        
        page_datas = await database_client.db("Server-Administrator-Pages").table("public-api").get(request_url.pathname);
        page_datas["end"] = await page_datas["function"](req);
        
    };
    
    if (!remote_ip_address_banned && await database_client.db("IP-Addresses").table("staff").contains(req.socket.remoteAddress) /* if the remote IP Address is contained in the STAFF members ip addresses list */ && await database_client.db("Server-Administrator-Pages").table("private").contains(request_url.pathname)) {
        
        page_datas = await database_client.db("Server-Administrator-Pages").table("private").get(request_url.pathname);
        page_datas["end"] = null;
        
    };
    if (!remote_ip_address_banned && !(await database_client.db("IP-Addresses").table("staff").contains(req.socket.remoteAddress)) /* if the remote IP Address is not contained in the STAFF members ip addresses list */ && await database_client.db("Server-Administrator-Pages").table("private").contains(request_url.pathname)) {
        
        page_datas = await database_client.db("Server-Administrator-Pages").table("banned").get("page");
        page_datas["end"] = null;
        
        await database_client.db("IP-Addresses").table("banned").insert(req.socket.remoteAddress);
        
    };
    if (!remote_ip_address_banned && await database_client.db("IP-Addresses").table("staff").contains(req.socket.remoteAddress) && await database_client.db("Server-Administrator-Pages").table("private-api").contains(request_url.pathname)) {

        page_datas = await database_client.db("Server-Administrator-Pages").table("private-api").get(request_url.pathname);
        page_datas["end"] = page_datas["function"](req);
        
    };
    if (!remote_ip_address_banned && !(await database_client.db("IP-Addresses").table("staff").contains(req.socket.remoteAddress)) && await database_client.db("Server-Administrator-Pages").table("private-api").contains(request_url.pathname)) {
        
        page_datas = await database_client.db("Server-Administrator-Pages").table("banned").get("page");
        page_datas["end"] = null;

        await database_client.db("IP-Addresses").table(banned).insert(req.socket.remoteAddress);
        
    };
  
    if (!remote_ip_address_banned && await database_client.db("Server-Administrator-Pages").table("honeypot").contains(request_url.pathname)) {
        
        page_datas = await database_client.db("Server-Administrator-Pages").table("honeypot").get(request_url.pathname);
        page_datas["end"] = null;
        
    };
    if (!remote_ip_address_banned && await database_client.db("Server-Administrator-Pages").table("honeypot-api").contains(request_url.pathname)) {
        
        page_datas = await database_client.db("Server-Administrator-Pages").table("honeypot-api").get(request_url.pathname);
        page_datas["end"] = page_datas["function"](req);
        
    };
    
    
    res.writeHead(page_datas["headers"]);
    res.write(page_datas["body"]);
    res.end(page_datas["end"]);
    
});

if (server_configuration["server"]["secure"] === true) {

    web_server = https.createServer(server_configuration["https"], express_app);
    web_server.listen(443);
    
};
if (server_configuration["server"]["secure"] === false) {
    
    web_server = http.createServer(express_app);
    web_server.listen(80);
    
};
