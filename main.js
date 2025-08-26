// global variables

const __dirname = import.meta.dirname;
import {createRequire} from "node:module";
const require = createRequire(import.meta.url);

const os_administrator_command_prefix = "sudo"; // change it to the one of your OS


// server administration functions

function run_command(method, args) {
    
    let { spawn } = require("node:process");
    
    let child_process = spawn([(method), (args)], {detached: true, shell: true, windowsHide: true});
    let command_result;
        child_process.stdout.on("data", function(data) {

            command_result = data;
        
        });
        child_process.exit();

    return command_result;
      
};


// firewalls functions

function run_ufw_command(args) {
    
    run_command("ufw", args);
    
};
function run_ufw_administrator_mode_command(args) {

    run_command(os_administrator_command_prefix, ["ufw", (args)]);
    
};
function run_iptables_command(args) {
    
    run_command("iptables", args);
    
};
function run_iptables_administrator_mode_command(args) {

    run_command(os_administrator_command_prefix, ["iptables", (args)]);
    
};

function run_apt_command(args) {
    
    run_command("apt", args);
    
};
function run_apt_administrator_mode_command(args) {

    run_command(os_administrator_command_prefix, ["apt", (args)]) {};
    
};


// global dependancies

const crypto = await import("node:crypto"),
      fs = await import("node:fs"),
      http = await import("node:http"),
      https = await import("node:https");

const cloudflare = await import("cloudflare");


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
    "web-pages": {
        
        "public": {

            "/": `<!DOCTYPE html>
<html>
    
    <head>

        <meta charset="utf-8">
        <script>
        </script>
        <style>
        </style>
        
    </head>
    <body>
        
        <p>Welcome</p>
        
    </body>
    <footer>
        
    </footer>
    
</html>`
            
        },
        "public-api": {
            
            "/api/": {
                
                "headers": {
    
    
    "Content-Type": "application/json",
    "Encoding": "utf-8"
},
                "function": function (request_datas) {

                    let request_url = new URL(`https://localhost${request_datas.url}`);
                    
                    if (request_url.pathname === "/api/v1") {
                        
                        
                        
                    };
                    
                }
                
            }
            
        },
        "whitelisted": {},
        "whitelisted-api": {},
        "private": {},
        "private-api": {},
        "honeypot": {},
        "honeypot-api": {},
        "banned": {
            
            "page": "<!DOCTYPE html><html><head></head><body></body><footer></footer></html>"
            
        }
        
    }
    
};

var web_server,
    database_client;

if (server_configuration["database"]["app"] === "PostgresDB") {

    db = require("Postgres");
    
};
if (server_configuration["database"]["app"] === "RethinkDB") {

    db = require("rethinkdb");
    
    database_client = db;
    database_client.connect();
    
};
if (server_configuration["database"]["app"] === "") {

    
    
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
