(function(undefined){
    "use strict";
    var _module = angular.module('jb.backofficeAPIWrapper', ['jb.apiWrapper']);

    /**
     * @todo: make the representation more explicit by preserving the type of the relation!
     * @param apiWrapper
     * @constructor
     */
    function BackofficeAPIWrapperService(apiWrapper){
        this.api = apiWrapper;
        this.fieldTypeMapping =  {
              'string'   : 'text'
            , 'decimal'  : 'number'
            , 'integer'  : 'number'
            , 'boolean'  : 'boolean'
            , 'json'     : 'json'
            , 'datetime' : 'datetime'
            , 'date'     : 'datetime'
        };
    }

    BackofficeAPIWrapperService.prototype.request = function(method, params, copyParams) {
        var parameters = (copyParams === false || !method) ? params : angular.copy(params);
        parameters.method = method;
        return this.api.request(parameters);
    };

    BackofficeAPIWrapperService.prototype.getOptions = function(endpoint, params) {
        var parameters = angular.copy(params) || {};
        parameters.url = endpoint;
        return this.request('OPTIONS', parameters, false).then(this.normalizeOptions.bind(this));
    };

    BackofficeAPIWrapperService.prototype.normalizeMappings = function(mappings, options){
        Object.keys(mappings).forEach(function(property) {
            var fieldSpec = mappings[property]
                , relation = {};
            /**
             * @todo: resolve the aliases using the belongs to data, if an entity is within a has many relation
             */
            relation.type           = 'relation';
            relation.entity         = fieldSpec.modelName;
            relation.relationKey    = fieldSpec.key;
            // the id key of the referenced model
            relation.relatedKey     = fieldSpec.primaryKey;
            // use modelName instead of referencedModelName as model is not referenced, but mapped
            relation.relation       = fieldSpec.hasAlias ? fieldSpec.name : fieldSpec.modelName;
            relation.alias          = fieldSpec.hasAlias ? fieldSpec.name : false;
            relation.relationType   = 'multiple';
            relation.originalRelation  = 'hasMany';
            relation.tableName         = fieldSpec.table.name;


            if (relation.entity === 'language') relation.type = 'language';
            if (relation.entity === 'image')    relation.type = 'image';

            options[property] = relation;
        });
    };

    BackofficeAPIWrapperService.prototype.normalizeReferences = function(references, options){
        Object.keys(references).forEach(function(property){

            var   fieldSpec = references[property]
                , reference = {};

            reference.type      = 'relation';
            reference.entity    = fieldSpec.referencedModelName;
            // referencedModelName is the same as modelName for has many (but referenced as it's hasOne)
            reference.relation  = fieldSpec.hasAlias ? fieldSpec.name : fieldSpec.referencedModelName;

            // If property is an alias, set alias here. Alias for event is e.g. parentEvent (EventBooster).
            // Alias must be used to save relation, but is not available to GET data.
            // GET /originalEntityNameName
            // POST /alias/id/otherEntity/id
            // @todo: check if this is used anywhere!
            reference.alias = fieldSpec.hasAlias ? fieldSpec.name : false;

            reference.relationType = 'single';
            reference.required     = fieldSpec.nullable === false;
            reference.originalRelation  = 'hasOne';
            reference.relationKey       = fieldSpec.key;
            reference.relatedKey        = fieldSpec.referencedColumn;

            options[property] = reference;
            options.internalReferences = options.internalReferences || {};
            options.internalReferences[reference.relationKey] = reference;

            if (reference.entity == 'image') reference.type = 'image';
        });
    };

    BackofficeAPIWrapperService.prototype.normalizeInverseReferences = function(references, options){
        Object.keys(references).forEach(function(property){
            /**
             * @todo: there is a property isMapping, we could merge the mapping data with the current belongs to
             */
            var fieldSpec = references[property];
            options[property] = {
                  type          : 'relation'
                , entity        : fieldSpec.modelName
                , relation      : fieldSpec.hasAlias ? fieldSpec.name : fieldSpec.modelName
                , relatedKey    : fieldSpec.referencedColumn
                , alias         : fieldSpec.hasAlias ? fieldSpec.name : false
                , relationType  : 'multiple' // #todo: always multiple?
                , required      : false //!singleFieldData[ p ].nullable won't work, as nullable ain't set
                , originalRelation : 'belongsTo'
            };
        });
    };

    BackofficeAPIWrapperService.prototype.normalizeFields = function(fields, options){
        Object.keys(fields).forEach(function(property){
            var   fieldSpec = fields[property];

            if(fieldSpec.name && fieldSpec.type){
                var fieldType =  this.fieldTypeMapping[fieldSpec.type];
                if(angular.isDefined(fieldType)){
                    var spec = {
                          type      : fieldType
                        , required  : !fieldSpec.nullable
                        , isPrimary : fieldSpec.name === fields.primaryKey
                        , name      : fieldSpec.name
                    };
                    if(fieldType == 'datetime'){
                        spec.time = fieldSpec.type === 'datetime';
                    }
                    options[property] = spec;
                    if(angular.isUndefined(options.internalFields)) options.internalFields = {};
                    options.internalFields[fieldSpec.name] = spec;
                } else {
                    console.error('DetailViewController: unknown field type %o', fieldSpec.type);
                }
            }
        }, this);
    };

    BackofficeAPIWrapperService.prototype.normalizeOptions = function(optionCallData) {

        var   options   = {}
            // for security reasons we copy the field data and avoid modification
            , optionsData = angular.copy(optionCallData)
            , hasMany   = optionsData.hasMany
            , belongsTo = optionsData.belongsTo
            , hasOne    = optionsData.hasOne;

        delete optionsData.hasMany;
        delete optionsData.belongsTo;
        delete optionsData.hasOne;

        this.normalizeReferences(hasOne, options);
        this.normalizeInverseReferences(belongsTo, options);
        this.normalizeMappings(hasMany, options);
        this.normalizeFields(optionsData, options);

        console.log('DetailView: parsed options are %o', options);
        return options;
    };

    _module.service('BackofficeAPIWrapperService', ['APIWrapperService', BackofficeAPIWrapperService]);
})();