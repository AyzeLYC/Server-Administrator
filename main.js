// global variables

const __dirname = import.meta.dirname;
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

const os_administrator_command_prefix = "sudo"; // change it to the one of your OS if it isn't sudo


// server administration functions

// run commands functions

function run_command(method, args) {
    
    let { spawn } = require("node:process");
    
    let command_result;
    let child_process = spawn([(method), (args)], {detached: true, shell: true, windowsHide: true});
        child_process.stdout.on("data", function(data) {

            command_result = data;
        
        });
        child_process.exit();

    console.log(`Used command ${method} ${args} !\n Command result : ${command_result}`);
      
};

// firewalls functions

function run_ufw_command(args) {
    
    run_command("ufw", args);
    
};
function run_ufw_administrator_enabled_command(args) {

    run_command(os_administrator_command_prefix, ["ufw", (args)]);
    
};
function run_iptables_command(args) {
    
    run_command("iptables", args);
    
};
function run_iptables_administrator_enabled_command(args) {

    run_command(os_administrator_command_prefix, ["iptables", (args)]);
    
};

// updates functions

function run_apt_command(args) {
    
    run_command("apt", args);
    
};
function run_apt_administrator_enabled_command(args) {

    run_command(os_administrator_command_prefix, ["apt", (args)]);
    
};

// networking logs functions

function run_netstat_v_command() {

    run_command("netstat", ["-v"]);
    
};
function run_netstat_v_administrator_enabled_command() {

    run_command(os_administrator_command_prefix, ["netstat", "-v"]);
    
};



// global dependancies

const crypto = require("node:crypto"),
      domain = require("node:domain"),
      fs = require("node:fs"),
      http = require("node:http"),
      https = require("node:https");

const cloudflare = require("cloudflare");


// server functions and variables

var server_configuration = {

    "secure": true,
    "database": {
        
        "app": "rethinkdb",
        "connection_settings": {

            db: "server",
            host: "localhost",
            password: "set your DataBase password here",
            port: 28015,
            timeout: 120,
            user: "set your DataBase username here"
            
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
    "owner": {

        "name": "",
        "address": "", // optional datas, only use it if you are a medium / big sized company with good lawyers
        
    },
    "staff": {},
    "web-pages": {}
    
};

var web_server,
    database_client;

if (server_configuration["database"]["app"] === "rethinkdb") {

    db = require("rethinkdb");

    database_client = db;
    database_client.connect();

    server_configuration["web-pages"]["public"] = await database_client.db("Server-Administrator-Pages").table("public").getAll();
    server_configuration["web-pages"]["public-api"] = await database_client.db("Server-Administrator-Pages").table("public-api").getAll();
    server_configuration["web-pages"]["banned"] = await database_client.db("Server-Administrator-Pages").table("banned").getAll();
    server_configuration["web-pages"]["banned-api"] = await database_client.db("Server-Administrator-Pages").table("banned-api").getAll();
    server_configuration["web-pages"]["private"] = await database_client.db("Server-Administrator-Pages").table("private").getAll();
    server_configuration["web-pages"]["private-api"] = await database_client.db("Server-Administrator-Pages").table("private-api").getAll();
    server_configuration["web-pages"]["honeypot"] = await database_client.db("Server-Administrator-Pages").table("honeypot").getAll();
    server_configuration["web-pages"]["honeypot-api"] = await database_client.db("Server-Administrator-Pages").table("honepot-api").getAll();
    
};
if (server_configuration["database"]["app"] === "PostgreSQL") {

    db = require("postgres");
    
    database_client = db;
    
};
if (server_configuration["database"]["app"] === "JSON") {

    server_configuration["web-pages"] = require("web-pages.json");
    
};

var express_app = express();

express_app.use(function(req, res) {
    
    let request_url = new URL(`https://localhost${req.url}`);
    
    let remote_ip_address_banned = server_configuration["IP-Addresses"]["banneed"][(req.socket.remoteAddress)],
        remote_ip_address_staff_owned = server_configuration["IP-Addresses"]["staf"][(req.socket.remoteAddress)];
    
    let page_datas = "";
    
    if (remote_ip_address_banned) {
        
        page_datas = server_configuration["web-pages"]["banned"]["default"];
        page_datas["end"] = null;
        
    };
    
    
    if (!remote_ip_address_banned /* if the IP Address is not banned */ && server_configuration["web-pages"]["public"][(request_url.pathname)]) {
        
        page_datas = server_configuration["web-pages"]["public"][(request_url.pathname)];
        page_datas["end"] = null;
        
    };
    if (!remote_ip_address_banned && server_configuration["web-pages"]["public-api"][(request_url.pathname]) {
        
        page_datas = server_configuration["web-pages"]["public-api"][(request_url.pathname)];
        page_datas["end"] = page_datas["function"](req);
        
    };
    
    if (!remote_ip_address_banned && remote_ip_address_staff_owned /* if the remote IP Address is contained in the STAFF members ip addresses list */ && server_configuration["web-pages"]["private"][(request_url.pathname)]) {
        
        page_datas = server_configuration["web-pages"]["staff"][(request_url.pathname)];
        page_datas["end"] = null;
        
    };
    if (!remote_ip_address_banned && !remote_ip_address_staff_owned /* if the remote IP Address is not contained in the STAFF members ip addresses list */ && server_configuration["web-pages"]["private"][(request_url.pathname)]) {
        
        page_datas = server_configuration["web-pages"]["banned"]["default"];
        page_datas["end"] = null;

        server_configuration["IP-Addresses"]["banned"].push(req.socket.remoteAddress);
        
    };
    if (!remote_ip_address_banned && remote_ip_address_staff_owned && server_configuration["web-pages"]["private-api"][(request_url.pathname)]) {

        page_datas = server_configuration["web-pages"]["private-api"][(request_url.pathname)];
        page_datas["end"] = page_datas["function"](req);
        
    };
    if (!remote_ip_address_banned && !remote_ip_address_staff_owned && server_configuration["web-pages"]["private-api"][(request_url.pathname)]) {
        
        page_datas = server_configuration["web-pages"]["banned"]["default"];
        page_datas["end"] = null;

        server_configuration["IP-Addressees"]["banned"].push(req.socket.remoteAddress);
        
    };
    
    if (!remote_ip_address_banned && !remote_ip_address_staff_owned && server_configuration["web-pages"]["honeypot"][(request_url.pathname)]) {
        
        page_datas = server_configuration["web-pages"]["honeypot"][(request_url.pathname)];
        page_datas["end"] = null;
        
    };
    if (!remote_ip_address_banned && !remote_ip_address_staff_owned && server_configuration["web-pages"]["honeypot-api"][(request_url.pathname)]) {
        
        page_datas = server_configuration["web-pages"]["honeypot-api"][(request_url.pathname));
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
