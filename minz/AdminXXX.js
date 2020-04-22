'use strict';

var conf = require("./Config").getConfig();
const variables = require("./variables").Variables.instance;
const dimensions = require("./Dimensions").Dimensions.instance;

class Admin extends ZModule {
    static get instance() {
        if (!global.adminInstance) global.adminInstance = new Admin();
        return global.adminInstance;
    }
    login(pwd, site) {
        if (!site) throw "No site provided";
        var s = Object.values(conf.sites).find(s => s.url == site.url);
        if (!s) throw "No site found at url '" + site.url + "'";
        if (pwd != s.password) throw("Contraseña inválida");        
    }
    getDefaultSite() {
        if (!conf.sites) throw "No sites configured";
        var s = Object.values(conf.sites).find(s => s.default);
        if (!s) throw "No default site configured";
        s = JSON.parse(JSON.stringify(s));
        s.password = "****";
        return s;
    }
    getSiteFromURL(url) {
        if (!conf.sites) throw "No sites configured";
        if (url.startsWith("/_embedded_")) url = "/" + url.substring(11);
        var s = Object.values(conf.sites).find(s => s.url == url);
        if (!s) throw "No site found at url '" + url + "'";
        s = JSON.parse(JSON.stringify(s));
        s.password = s.password?true:false;
        return s;
    }
    
    // Variables
    getVariables(filter) {return variables.getVariables(filter);}
    addVariable(variable) {return variables.addVariable(variable);}
    saveVariable(variable) {return variables.saveVariable(variable);}
    deleteVariable(code) {return variables.deleteVariable(code);}
    addClassifierToVariable(variableCode, classifier) {return variables.addClassifier(variableCode, classifier)}
    saveVariableClassifier(variableCode, classifier) {return variables.saveClassifier(variableCode, classifier)}
    deleteVariableClassifier(variableCode, classifier) {return variables.deleteClassifier(variableCode, classifier)}
    fullIndex(variableCode) {return variables.fullIndex(variableCode)}
    getVarStatus(variableCode) {return variables.getVarStatus(variableCode)}

    // Dimensions
    getDimension(dimensionCode) {return dimensions.getDimension(dimensionCode);}
    getDimensions(filter) {return dimensions.getDimensions(filter);}
    addDimension(dimension) {return dimensions.addDimension(dimension);}
    saveDimension(dimension) {return dimensions.saveDimension(dimension);}
    deleteDimension(code) {return dimensions.deleteDimension(code);}
    addClassifierToDimension(dimensionCode, classifier) {return dimensions.addClassifierToDimension(dimensionCode, classifier)}
    saveDimensionClassifier(dimensionCode, classifier) {return dimensions.saveDimensionClassifier(dimensionCode, classifier)}
    deleteDimensionClassifier(dimensionCode, classifier) {return dimensions.deleteDimensionClassifier(dimensionCode, classifier)}
    // Data
    async getDimRowsCount(dimensionCode, textFilter, filter) {return {n:await dimensions.getRowsCount(dimensionCode, textFilter, filter)}}
    getDimRow(dimensionCode, code) {return dimensions.getRow(dimensionCode, code)}
    getDimRows(dimensionCode, textFilter, filter, startRow, nRows) {return dimensions.getRows(dimensionCode, textFilter, filter, startRow, nRows)}
    getDimRowsWithClassifiersNames(dimensionCode, textFilter, filter, startRow, nRows) {return dimensions.getRowsWithClassifiersNames(dimensionCode, textFilter, filter, startRow, nRows)}
    addDimRow(dimensionCode, row) {return dimensions.addRow(dimensionCode, row)}
    saveDimRow(dimensionCode, row) {return dimensions.saveRow(dimensionCode, row)}
    deleteDimRow(dimensionCode, code) {return dimensions.deleteRow(dimensionCode, code)}
    analizeClassifiers(dimensionCode) {return dimensions.analizeClassifiers(dimensionCode)}
    moveRowUpInView(dimensionCode, textFilter, filter, rowCode) {return dimensions.moveRowUpInView(dimensionCode, textFilter, filter, rowCode)}
    moveRowDownInView(dimensionCode, textFilter, filter, rowCode) {return dimensions.moveRowDownInView(dimensionCode, textFilter, filter, rowCode)}
    importDimensionRows(dimensionCode, rows) {return dimensions.importRows(dimensionCode, rows)}
    getDimRowWithDependencies(dimensionCode, code) {return dimensions.getRowWithDependencies(dimensionCode, code)}

    getPlugins() {
        return Object.keys(plugins);
    }
    async exportConfiguration() {
        let dims = dimensions.getDimensions();
        let vars = variables.getVariables();
        return {dimensions:dims, variables:vars};
    }
    async importConfiguration(conf) {
        try {
            await dimensions.importDimensions(conf.dimensions);
            await variables.importVariables(conf.variables);
        } catch(error) {
            throw "Error importing configuration:" + error.toString();
        }
    }
}

exports.Admin = Admin;