'use strict';

const ZModule = require("../z-server").ZModule;
const config = require("./config").Config.instance.getSync();
const fs = require("fs");
const variables = require("./variables").Variables.instance;

class Dashboards extends ZModule {
    static get instance() {
        if (!global.dasboardsInstance) global.dasboardsInstance = new Dashboards();
        return global.dasboardsInstance;
    }

    getDashboardsDirectories(site) {
        if (!site) throw "No site provided";
        return new Promise((onOk, onError) => {            
            fs.readdir(site.path, (err, files) => {
                if (err) {
                    onError(err);
                    return;
                }
                let promises = [];
                files.forEach(f => {
                    promises.push(new Promise((onOk2, onError2) => {
                        fs.stat(site.path + "/" + f, (err2, stat) => {
                            if (err2) {
                                onError2(err2);
                                return;
                            }
                            if (stat.isDirectory()) onOk2(f.toString().trim());
                            else onOk2(null);
                        });
                    }));
                });
                Promise.all(promises)
                    .then(filesAndDirs => {
                        onOk(filesAndDirs.filter(f => f?true:false));
                    })
                    .catch(err => onError(err));
            });
        });                        
    }
    getDashboards(site) {
        if (!site) throw "No site provided";
        return new Promise((onOk, onError) => {
            this.getDashboardsDirectories(site)
            .then(dirs => {
                dirs.sort();
                let content = {};
                let promises = [];
                dirs.forEach(d => {
                    promises.push(new Promise((onOk2, onError2) => {
                        fs.readdir(site.path + "/" + d, (err, files) => {
                            if (err) onError2(err);
                            else {
                                files.forEach(f => {
                                    if (f.endsWith(".js")) {
                                        if (!content[d]) content[d] = [];
                                        content[d].push(f);
                                    }
                                });
                                onOk2();
                            }
                        });    
                    }));
                })
                Promise.all(promises)
                    .then(() => {
                        let ret = [];
                        dirs.forEach(d => {
                            if (content[d]) {
                                content[d].sort();
                                ret.push({dir:d, files:content[d]});
                            }
                        });
                        onOk(ret);
                    })
                    .catch(err => onError(err));
            })
            .catch(err => onError(err));
        });
    }
    getDashboard(site, dir, file) {
        if (!site) throw "No site provided";
        return new Promise((onOk, onError) => {
            let path = site.path + "/" + dir + "/" + file;
            require("fs").readFile(path, (err, data) => {
				if (err) onError("Can't open file:" + path + ". " + err.toString());
				else {
                    try {
                        onOk(data.toString());
                    } catch(error) {
                        console.log(error);
                        onError("Cannot open dashboard:" + error.toString());
                    }
				}
			});
        });
    }
    async calculateDataset(type, dsConf) {
        switch(type) {
            case "timeSerie":
                return await variables.getTimeSerie(dsConf.variable, dsConf.temporality, dsConf.period.startTime, dsConf.period.endTime, dsConf.filter);
            case "periodResume":
                return await variables.getPeriodResume(dsConf.variable, dsConf.period.startTime, dsConf.period.endTime, dsConf.filter);
            case "dimSerie":
                return await variables.getDimSerie(dsConf.variable, dsConf.period.startTime, dsConf.period.endTime, dsConf.filter, dsConf.groupDimension);
            case "timeDimTable":
                return await variables.getTimeDimTable(dsConf.variable, dsConf.temporality, dsConf.period.startTime, dsConf.period.endTime, dsConf.groupDimension, dsConf.filter);
            case "dimDimTable":
                return await variables.getDimDimTable(dsConf.variable, dsConf.period.startTime, dsConf.period.endTime, dsConf.hGroupDimension, dsConf.vGroupDimension, dsConf.filter);
            default:
                throw("Dataset type '" + type + "' not handled");
        }
    }    
}

exports.Dashboards = Dashboards