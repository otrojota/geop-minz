global.confPath = __dirname + "/config.json";
const config = require("./minz/Config").getConfig();
const restAPI = require("./minz/RestAPI");
const http = require("http");

start();

async function start() {
    // Inicializar
    await require("./minz/MongoDB").init();
    await require("./minz/Dimensions").init();
    await require("./minz/Variables").init();

    // Web server
    let express = require('express');
    let app = express();
    let bodyParser = require('body-parser');

    app.use(bodyParser.urlencoded({extended:true}));
    app.use(bodyParser.json());
    app.use(function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers");
        next();
    });

    restAPI.register(app);
    if (config.webServer && config.webServer.http) {
        let port = config.webServer.http.port;
        httpServer = http.createServer(app);
        httpServer.listen(port, function () {
            console.log("[minz] HTTP Server started on port " + port);
        });
    }
}