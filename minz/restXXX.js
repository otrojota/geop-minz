'use strict';

const ZModule = require("../z-server").ZModule;
const variables = require("./Variables").Variables.instance;
const dimensions = require("./dimensions").Dimensions.instance;

class Rest extends ZModule {
    static get instance() {
        if (!global.restInstance) global.restInstance = new Rest();
        return global.restInstance;
    }
    register(app) {
        app.get("/variables", async (req, res) => {
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify(await variables.getVariables(null)));
        });
        app.get("/dimRows/:dimensionCode", async (req, res) => {
            let dimensionCode = req.params.dimensionCode;
            let textFilter = null;
            let filter = {};
            Object.keys(req.query).forEach(filterName => {
                if (filterName == "textFilter") textFilter = req.query.textFilter;
                else filter[filterName] = req.query[filterName];
            });
            try {
                res.send(JSON.stringify(await dimensions.getRows(dimensionCode, textFilter, filter)));
            } catch(error) {
                console.log(error);
                res.status(500).send(error.toString());  
            }
        });
        app.post("/getDimRows/:dimensionCode", async (req, res) => {
            let dimensionCode = req.params.dimensionCode;
            let textFilter = req.body.textFilter;
            let filter = req.body.filter;
            try {
                res.send(JSON.stringify(await dimensions.getRows(dimensionCode, textFilter, filter)));
            } catch(error) {
                console.log(error);
                res.status(500).send(error.toString());  
            }
        });
        app.post("/accumBatch", async (req, res) => {
            res.setHeader('Content-Type', 'application/json');
            try {
                await variables.postDataBatch(req.body.batch, req.body.options);
                res.status(200).send(JSON.stringify({result:"OK"}));
            } catch(error) {
                console.log(error);
                res.status(500).send(JSON.stringify({result:"ERROR", msg:error.toString()}));                
            }
        });
        app.post("/:code", async (req, res) => {
            let varCode = req.params.code;
            res.setHeader('Content-Type', 'application/json');
            try {
                await variables.postData(varCode, req.body.time, req.body.value, req.body.data);
                res.status(200).send(JSON.stringify({result:"OK"}));
            } catch(error) {
                console.log(error);
                res.status(500).send(JSON.stringify({result:"ERROR", msg:error.toString()}));                
            }
        });
        app.post("/deletePeriod/:code", async (req, res) => {
            let varCode = req.params.code;
            res.setHeader('Content-Type', 'application/json');
            try {
                await variables.deletePeriod(varCode, req.body.startTime, req.body.endTime, req.body.varData, req.body.details);
                res.status(200).send(JSON.stringify({result:"OK"}));
            } catch(error) {
                console.log(error);
                res.status(500).send(JSON.stringify({result:"ERROR", msg:error.toString()}));                
            }
        });
        app.post("/dim/:code", async (req, res) => {
            let dimCode = req.params.code;
            res.setHeader('Content-Type', 'application/json');
            try {
                await dimensions.addOrUpdateRow(dimCode, req.body.row);
                res.status(200).send(JSON.stringify({result:"OK"}));
            } catch(error) {
                console.log(error);
                res.status(500).send(JSON.stringify({result:"ERROR", msg:error.toString()}));                
            }
        });
    }
}

exports.Rest = Rest