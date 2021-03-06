'use strict';

const mongo = require("./MongoDB");

class Dimensions {
    static get instance() {
        if (!Dimensions.singleton) Dimensions.singleton = new Dimensions();
        return Dimensions.singleton;
    }
    constructor() {
        this.dimensions = null;
    }
    async init() {
        try {
            await mongo.collection("z_dimensions");
            await this.loadDimensions();
        } catch(error) {
            throw error;
        }
    }

    // Dimensions
    async loadDimensions() {
        try {
            this.dimensions = {};
            let col = await mongo.collection("z_dimensions");
            let rows = await col.find().toArray();
            rows.forEach(r => {
                if (!r.classifiers) r.classifiers = [];
                this.dimensions[r.code] = r;            
            });
            //console.log("Dimensions", this.dimensions);
        } catch(error) {
            throw error;
        }
    }
    getDimensions(filter) {
        let f = filter?filter.toLowerCase():null;
        return Object.keys(this.dimensions)
            .map(code => this.dimensions[code])
            .filter(d => (!f || d.code.toLowerCase().indexOf(f) >= 0 || d.name.toLowerCase().indexOf(f) >= 0));
    }
    getDimension(dimensionCode) {
        return this.dimensions[dimensionCode];
    }
    async addDimension(dimension) {
        try {
            // Validate
            if (!dimension.classifiers) dimension.classifiers = [];
            if (!dimension.code || !dimension.name) {
                throw "Dimension must have code and name";
            }
            dimension.classifiers.forEach(c => {
                if (!c.dimensionCode || !c.fieldName || !c.defaultValue) {
                    throw "Classifier must have fieldName, dimensionCode and defaultValue"
                }
            });
            let col;
            try {   
                col = await mongo.collection(dimension.code);         
                col.createIndex({order:1});
            } catch(error) {
                throw("Cannot create Mongo Collection for dimension " + dimension.code + ": " + error.toString());
            }
            dimension._id = dimension.code;
            let colDims = await mongo.collection("z_dimensions");
            await colDims.insertOne(dimension);
            await this.loadDimensions();
            return dimension;
        } catch(error) {
            throw error;
        }
    }
    async saveDimension(dimension) {
        try {
            let oldDim = this.dimensions[dimension.code];
            if (!oldDim) throw("Cannot find dimension '" + dimension.code + "'");
            let colDims = await mongo.collection("z_dimensions");
            await colDims.updateOne({_id:dimension.code}, {
                $set:{name:dimension.name, classifiers:dimension.classifiers}
            });
            await this.loadDimensions();
            return dimension;
        } catch(error) {
            throw error;
        }
    }
    async addOrSaveDimension(dimension) {
        try {
            let d = await this.getDimension(dimension.code);
            if (d) {
                return await this.saveDimension(dimension);
            } else {
                return await this.addDimension(dimension);
            }
        } catch(error) {
            throw error;
        }
    }
    async deleteDimension(code) {
        try {
            await (await mongo.collection("z_dimensions")).deleteOne({_id:code});
            await (await mongo.collection(code)).drop();
            await this.loadDimensions();
        } catch(error) {
            throw error;
        }
    }

    // Dimension Data
    async getNextOrder(dimensionCode) {
        try {
            let [lastRow] = await (await mongo.collection(dimensionCode)).find({}).sort({order:-1}).limit(1).toArray();        
            return lastRow?lastRow.order+1:1;
        } catch(error) {
            throw error;
        }
    }
    async addRow(dimensionCode, row) {
        try {
            let d = this.dimensions[dimensionCode];
            if (!d) throw("No se encontró la dimensión '" + dimensionCode + "'");
            // Test classifiers and set to defaultValue if no provided
            for (let i=0; i<d.classifiers.length; i++) {
                let c = d.classifiers[i];
                if (row[c.fieldName] === undefined) {
                    row[c.fieldName] = c.defaultValue;
                } else {
                    await this.createDefaultRowIfNotExists(c.dimensionCode, row[c.fieldName]);
                }
            };
            row._id = row.code;
            row.order = await this.getNextOrder(dimensionCode);
            try {
                await (await mongo.collection(dimensionCode)).insertOne(row);
            } catch(error) {
                console.log(error);
                if (error.code == 11000) {
                    throw("El código ingresado para " + d.name + " ya existe");
                } else {
                    throw("Error agregando fila:" + error.toString());
                }
            }
            return row;
        } catch(error) {
            throw error;
        }
    }
    async saveRow(dimensionCode, row) {
        try {
            let d = this.dimensions[dimensionCode];
            if (!d) throw("No se encontró la dimensión '" + dimensionCode + "'");
            // Update classifiers
            let setObject = {name:row.name};
            for (let i=0; i<d.classifiers.length; i++) {
                let c = d.classifiers[i];
                let v = row[c.fieldName];
                if (v === undefined) {
                    v = c.defaultValue;
                    row[c.fieldName] = v;
                } else {
                    await this.createDefaultRowIfNotExists(c.dimensionCode, v);
                }
                setObject[c.fieldName] = v;            
            };
            await (await mongo.collection(dimensionCode)).updateOne({_id:row.code}, {$set:setObject});
            return row;
        } catch(error) {
            throw error;
        }
    }
    async deleteRow(dimensionCode, code) {
        try {
            let row = await this.getRow(dimensionCode, code);
            if (!row) throw "No se encontró la fila";
            await (await mongo.collection(dimensionCode)).deleteOne({_id:code});
            return row;
        } catch(error) {
            throw error;
        }
    }
    async getRow(dimensionCode, code) {
        try {
            let d = this.dimensions[dimensionCode];
            if (!d) throw("No se encontró la dimensión '" + dimensionCode + "'");
            let row = await (await mongo.collection(dimensionCode)).findOne({_id:code});
            return row;
        } catch(error) {
            throw error;
        }
    }
    async addOrUpdateRow(dimensionCode, row) {
        try {
            let d = this.dimensions[dimensionCode];
            if (!d) throw("No se encontró la dimensión '" + dimensionCode + "'");
            let setObject = {name:row.name};
            for (let i=0; i<d.classifiers.length; i++) {
                let c = d.classifiers[i];
                if (row[c.fieldName] === undefined) {
                    row[c.fieldName] = c.defaultValue;
                } else {
                    await this.createDefaultRowIfNotExists(c.dimensionCode, row[c.fieldName]);
                }
                setObject[c.fieldName] = row[c.fieldName];
            };
            row._id = row.code;
            row.order = await this.getNextOrder(dimensionCode);
            try {
                await (await mongo.collection(dimensionCode)).insertOne(row);
            } catch(error) {
                try {
                    await (await mongo.collection(dimensionCode)).updateOne({_id:row.code}, {$set:setObject});
                } catch(error2) {
                    console.log(error2);
                    throw("Cannot add or update row to dimension '" + dimensionCode + "':" + error2.toString());
                }
            }
            return row;
        } catch(error) {
            throw error;
        }
    }
    async createDefaultRowIfNotExists(dimensionCode, code) {
        try {
            let d = this.dimensions[dimensionCode];
            if (!d) throw("No se encontró la dimensión '" + dimensionCode + "'");
            let found = await (await mongo.collection(dimensionCode)).findOne({_id:code});
            if (found) return;
            let doc = {_id:code, code:code, name:d.name + " " + code}
            d.classifiers.forEach(c => {
                doc[c.fieldName] = c.defaultValue;
            });
            doc.order = await this.getNextOrder(dimensionCode);
            try {
                await (await mongo.collection(dimensionCode)).insertOne(doc);
            } catch(error) {
                throw("Cannot create default row in dimension '" + dimensionCode + "':" + error.toString());
            }
        } catch(error) {
            throw error;
        }
    }


    // Query filtering
    appendDimensionFilterLookup(c, filterObject) {
        let pipe = [];
        let letObject = {};
        letObject["id_" + c.fieldName] = "$" + c.fieldName;
        let lookupObject = {
            from:c.dimensionCode,
            as:c.fieldName + "_tmp",
            let:letObject,
            pipeline:[
                {$match:{$expr:{$eq:["$_id", "$$id_" + c.fieldName]}}}
            ]
        }
        // Apply filter for each classifier in filterObject
        var d = this.dimensions[c.dimensionCode];
        if (!d) throw "No se encontró la dimensión '" + c.dimensionCode + "'";
        let matchObject2 = {};

        Object.keys(filterObject).forEach(filterFieldName => {
            var v2 = filterObject[filterFieldName];
            if (v2 === null || typeof v2 == "string" || typeof v2 == "number") {
                matchObject2[filterFieldName] = v2;
            } else {
                var c2 = d.classifiers.find(c => c.fieldName == filterFieldName);
                if (!c2) throw "Nombre de campo '" + filterFieldName + "' inválido en filtro de dimensión";
                lookupObject.pipeline = lookupObject.pipeline.concat(this.appendDimensionFilterLookup(c2, v2));
            }
        });
        if (Object.keys(matchObject2).length) lookupObject.pipeline.push({$match:matchObject2});

        pipe.push({$lookup:lookupObject});
        pipe.push({$unwind:"$" + c.fieldName + "_tmp"}); // Remove row if array is empty
        
        let projectObject = {};
        projectObject[c.fieldName + "_tmp"] = 0;
        pipe.push({$project:projectObject});
        
        return pipe;
    }
    getDimensionFilterPipeline(varOrDimension, filter) {
        let pipe = [];
        if (!filter) return pipe;
        let matchObject = {};
        let lookupfilters = [];

        if (Array.isArray(filter)) {
            return [{$match:{code:{$in:filter}}}];
        }
        Object.keys(filter).forEach(filterFieldName => {
            let v = filter[filterFieldName];
            if (v === null || typeof v == "string" || typeof v == "number") {
                matchObject[filterFieldName] = v;
            } else if (Array.isArray(v)) {
                matchObject[filterFieldName] = {$in:v};
            } else if (typeof v == "object") {
                // {comuna:{provincia:{region:"05"}, tipoComuna:"rural"}}
                var c = varOrDimension.classifiers.find(c => c.fieldName == filterFieldName);
                if (!c) throw "Nombre de campo '" + filterFieldName + "' inválido en filtro de dimensión";
                lookupfilters = lookupfilters.concat(this.appendDimensionFilterLookup(c, v));
            }
        });
        // Add first match filter to discard rows faster
        if (Object.keys(matchObject).length) pipe.push({$match:matchObject});
        if (lookupfilters.length) pipe = pipe.concat(lookupfilters);
        return pipe;
    }
    getRowsFilterPipeline(dimensionCode, textFilter, filter) {
        let d = this.dimensions[dimensionCode];
        if (!d) throw("No se encontró la dimensión '" + dimensionCode + "'");
        let pipe = [];
        if (textFilter && textFilter.length) {
            pipe.push({
                $match:{
                    $or:[
                        {code:{$regex:textFilter, $options:"i"}},
                        {name:{$regex:textFilter, $options:"i"}}
                    ]
                }
            })
        }
        if (filter) pipe = pipe.concat(this.getDimensionFilterPipeline(d, filter));
        return pipe;
    }
    getRowsDimensionsPipeline(dimensionCode) {
        let d = this.dimensions[dimensionCode];
        if (!d) throw("No se encontró la dimensión '" + dimensionCode + "'");
        let pipe = [];
        d.classifiers.forEach(c => {
            let addFieldsObject = {};
            addFieldsObject[c.fieldName + "_name"] = "$" + c.fieldName + "_row.name";
            let removeFieldObject = {};
            removeFieldObject[c.fieldName + "_row"] = 0;
            pipe.push({
                $lookup:{
                    from:c.dimensionCode,
                    localField:c.fieldName,
                    foreignField:"_id",
                    as:c.fieldName + "_row"
                }
            }, {
                $unwind:{path:"$" + c.fieldName + "_row", preserveNullAndEmptyArrays:true}
            }, {
                $addFields:addFieldsObject
            }, {
                $project:removeFieldObject
            });
        });
        return pipe;
    }
    
    async getRowsCount(dimensionCode, textFilter, filter) {
        let pipe = this.getRowsFilterPipeline(dimensionCode, textFilter, filter);
        pipe.push({$count:"n"});
        let cursor = await (await mongo.collection(dimensionCode)).aggregate(pipe);
        let n = 0;
        if (await cursor.hasNext()) {
            let doc = await cursor.next();
            n = doc.n;
        }
        await cursor.close();
        return n;
    }
    async getRows(dimensionCode, textFilter, filter, startRow, nRows) {
        let pipe = this.getRowsFilterPipeline(dimensionCode, textFilter, filter);
        pipe.push({$sort:{order:1}});
        if (startRow !== undefined && nRows !== undefined) {
            pipe.push({$skip:startRow});
            pipe.push({$limit:nRows});
        }
        let cursor = await (await mongo.collection(dimensionCode)).aggregate(pipe);
        let rows = [];
        while(await cursor.hasNext()) {
            rows.push(await cursor.next());
        }
        await cursor.close();
        return rows;
    }
    async getRowsWithClassifiersNames(dimensionCode, textFilter, filter, startRow, nRows) {
        let pipe = this.getRowsFilterPipeline(dimensionCode, textFilter, filter);
        pipe = pipe.concat(this.getRowsDimensionsPipeline(dimensionCode));
        pipe.push({$sort:{order:1}});
        if (startRow !== undefined && nRows) {
            pipe.push({$skip:startRow});
            pipe.push({$limit:nRows});
        }

        let cursor = await (await mongo.collection(dimensionCode)).aggregate(pipe);
        let rows = [];
        while(await cursor.hasNext()) {
            rows.push(await cursor.next());
        }
        await cursor.close();
        return rows;
    }
    /*
    analizeClassifiers(dimensionCode) {
        // Count elements for each classifier (GUI can use search dialog or combo box)
        return new Promise((onOk, onError) => {
            let d =dimensions[dimensionCode];
            if (!d) onError("No se encontró la dimensión '" + dimensionCode + "'");
            let promises = [];
            d.classifiers.forEach(c => {
                promises.push(new Promise(async (onOk2, onError2) => {
                    try {
                        let n = await (await this.getCollection(c.dimensionCode)).find().count();
                        onOk2(n);
                    } catch(error) {
                        onError2(error);
                    }                    
                }));
            });
            Promise.all(promises)
                .then(ns => onOk(ns))
                .catch(error => onError(error));
        });
    }
    async moveRowUpInView(dimensionCode, textFilter, filter, rowCode) {
        let [originalRow] = await (await this.getCollection(dimensionCode)).find({_id:rowCode}).toArray();
        let pipe = this.getRowsFilterPipeline(dimensionCode, textFilter, filter);
        pipe.push({
            $match:{order:{$lt:originalRow.order}}
        })
        pipe.push({$sort:{order:-1}});
        pipe.push({$limit:1});

        let [row] = await (await this.getCollection(dimensionCode)).aggregate(pipe).toArray();
        if (!row) return;
        let swap = row.order;
        await (await this.getCollection(dimensionCode)).updateOne({_id:row._id}, {$set:{order:originalRow.order}});
        await (await this.getCollection(dimensionCode)).updateOne({_id:originalRow._id}, {$set:{order:swap}});        
    }
    async moveRowDownInView(dimensionCode, textFilter, filter, rowCode) {
        let [originalRow] = await (await this.getCollection(dimensionCode)).find({_id:rowCode}).toArray();
        let pipe = this.getRowsFilterPipeline(dimensionCode, textFilter, filter);
        pipe.push({
            $match:{order:{$gt:originalRow.order}}
        })
        pipe.push({$sort:{order:1}});
        pipe.push({$limit:1});

        let [row] = await (await this.getCollection(dimensionCode)).aggregate(pipe).toArray();
        if (!row) return;
        let swap = row.order;
        await (await this.getCollection(dimensionCode)).updateOne({_id:row._id}, {$set:{order:originalRow.order}});
        await (await this.getCollection(dimensionCode)).updateOne({_id:originalRow._id}, {$set:{order:swap}});        
    }
    */
    async findOrCreate(dimensionCode, id) {
        let d = this.dimensions[dimensionCode];
        if (!d) throw("No se encontró la dimensión '" + dimensionCode + "'");
        let doc = await (await mongo.collection(dimensionCode)).findOne({_id:id});
        if (!doc) {
            doc = {_id:id, code:id, name:d.name + " " + id};
            d.classifiers.forEach(c => doc[c.fieldName] = c.defaultValue);
            doc.order = await this.getNextOrder(dimensionCode);
            try {
                await (await mongo.collection(dimensionCode)).insertOne(doc);
            } catch(error) {
                // Ignorar .. en modo batch se procesan en paralelo
            }
        }
    }
    /*
    async importRows(dimensionCode, rows) {
        let d =dimensions[dimensionCode];
        if (!d) throw("No se encontró la dimensión '" + dimensionCode + "'");
        let col = await this.getCollection(dimensionCode);
        for (let i=0; i<rows.length; i++) {
            let row = rows[i];
            // Check classifiers integrity
            for (let j=0; j<d.classifiers.length; j++) {
                let c = d.classifiers[j];
                await this.findOrCreate(c.dimensionCode, row[c.fieldName]);
            }
            let doc = await col.findOne({_id:row.code});
            if (doc) {
                // update record
                let setObject = {name:row.name};
                d.classifiers.forEach(c => setObject[c.fieldName] = row[c.fieldName]);
                await col.updateOne({_id:row.code}, {$set:setObject});
            } else {
                doc = {_id:row.code, code:row.code, name:row.name};                
                d.classifiers.forEach(c => doc[c.fieldName] = row[c.fieldName]);
                doc.order = await this.getNextOrder(dimensionCode);
                await col.insertOne(doc);
            }
        };
    }
    async getRowWithDependencies(dimensionCode, code) {
        let d =dimensions[dimensionCode];
        if (!d) throw("No se encontró la dimensión '" + dimensionCode + "'");
        let doc = await (await this.getCollection(dimensionCode)).findOne({_id:code});
        for (let i=0; i<d.classifiers.length; i++) {
            let c = d.classifiers[i];
            doc[c.fieldName] = await this.getRowWithDependencies(c.dimensionCode, doc[c.fieldName]);
        }
        return doc;
    }
    */
}

module.exports = Dimensions.instance;