(function (undefined) {

    'use strict';

    // Bind to form components module.
    var _module = angular.module('jb.formComponents');

    /**
     * Helper function to properly extract the parent id from the options data.
     */

    function getParentId(optionsData, entity){
        var   keys  = optionsData.primaryKeys
            , key   = keys[0];

        if(keys.length !== 1) throw Error('The entity used in a form view needs to have a single field primary key');
        return entity[key];
    }

    function JBFormViewAdapterReferenceStrategy(formView, $q, api, scope){
        this.formView           = formView;
        this.optionsData        = null;
        this.initialId          = null;
        this.parentOptionsData  = null;
        this.isDeleted          = false;
        this.$q                 = $q;
        this.parentId           = null;
        this.setupListeners(scope);
    }

    /**
     * Since the Reference is not made for the use in repeating views, we do not emit the corresponding event to parent scopes.
     *
     * @param scope
     */
    JBFormViewAdapterReferenceStrategy.prototype.setupListeners = function(scope){
        scope.$on('removedDetailView', function(event){
            event.stopPropagation();
        });
    };

    JBFormViewAdapterReferenceStrategy.prototype.handleOptionsData = function(data){
        this.parentOptionsData  = data;
        this.optionsData        = this.formView.getSpecFromOptionsData(data);
        return this.formView.getOptionsData();
    };

    JBFormViewAdapterReferenceStrategy.prototype.beforeSaveTasks = function(){
        return this.formView.makeSaveRequest();
    };

    JBFormViewAdapterReferenceStrategy.prototype.afterSaveTasks = function(id){
        return id;
    };

    JBFormViewAdapterReferenceStrategy.prototype.getReferencingFieldName = function(){
        return this.optionsData.property;
    };
    /**
     * Extracts the id of the nested object and extracts the data the form view has to distribute.
     * @param data
     */
    JBFormViewAdapterReferenceStrategy.prototype.handleGetData = function(data){

        var   id, content;

        if(data){
            id      = data[this.getReferencingFieldName()];
            content = data[this.formView.getEntityName()];
            this.parentId   = getParentId(this.parentOptionsData, data);
        }

        this.initialId  = id;
        this.formView.setEntityId(id);
        return this.formView.distributeData(content);
    };

    JBFormViewAdapterReferenceStrategy.prototype.getSelectFields = function(){
        var selects = this.formView.getSelectParameters().map(function (select) {
                return [this.formView.getEntityName(), select].join('.');
            }.bind(this));
        // add the referenced property name to the selects
        return [this.getReferencingFieldName()].concat(selects);
    };

    JBFormViewAdapterReferenceStrategy.prototype.isValid = function(){
        // add the referenced property name to the selects
        return this.formView.isValid();
    };

    JBFormViewAdapterReferenceStrategy.prototype.getSaveCalls = function(){

        var   calls    = this.formView.generateSaveCalls()
            , call     = {};

        if(this.initialId == this.formView.getEntityId()) return calls;
        // id has changed
        call.data   = {};
        call.data[ this.getReferencingFieldName() ] = this.formView.getEntityId();
        return [ call ].concat(calls);
    };

    JBFormViewAdapterReferenceStrategy.prototype.deleteRelation = function(){
        if(this.formView.isNew() || !this.parentId) return;

        var endpoint = [
            this.optionsData.name
            , this.formView.getEntityId()
            , this.parentOptionsData.resource
            , this.initialParentId
        ].join('/');

        return this.api.delete(endpoint);
    };


    /**
     * Inverse Reference (belongs to) handling for nested form views.
     *
     * @todo: in the future we probably need to be able to pick a certain element out of the collection (itemIndex)
     *
     * @param formView
     * @constructor
     */
    function JBFormViewAdapterInverseReferenceStrategy(formView, $q, api, scope){
        this.formView           = formView;
        this.optionsData        = null;
        this.initialParentId    = null;
        this.parentId           = null;
        this.parentOptionsData  = null;
        this.itemIndex          = 0;
        this.isDeleted          = false;
        this.$q                 = $q;
        this.api                = api;
        this.hadData            = false;
        this.initialize(formView);
        this.setupListeners(scope);
    }

    JBFormViewAdapterInverseReferenceStrategy.prototype.setupListeners = function(scope) {
        scope.$on('deletedDetailView', function(event) {
            var currentScope = event.currentScope;
            event.stopPropagation();
            currentScope.$parent.$emit('removeElement', this.itemIndex);
        }.bind(this));
    };

    /**
     * This one should add the save call at the form-view.
     * @todo: add a validator which checks if the reference to the parent form-view is required!
     * @todo: check this, there are cases where the parent id might be the same (if we create a new sub entity in relation to a parent)
     *
     * This is a more secure way of setting up the relation because the related entity might need the id to be saved.
     * Therefore we cannot set it using the default endpoint.
     *
     * @param formView
     */
    JBFormViewAdapterInverseReferenceStrategy.prototype.initialize = function(formView){
        var self = this;

        formView.registerComponent({
              registerAt:   function(parent){}
            , unregisterAt: function(parent){}
            , isValid:      function(){}
            , getSaveCalls: function(){
                var call = { data: {} };
                if(self.initialParentId == self.parentId && angular.isDefined(self.formView.getEntityId())) return [];
                call.data[ self.getReferencingFieldName() ] = self.parentId;
                return [ call ];
            }
        });
    };

    JBFormViewAdapterInverseReferenceStrategy.prototype.handleOptionsData = function(data){
        this.optionsData        = this.formView.getSpecFromOptionsData(data);
        this.parentOptionsData  = data;
        return this.formView.getOptionsData();
    };

    /**
     * @todo: move this to the `afterSaveTasks`
     * @todo: set the entity id on the current detail view (is this possible?)
     */
    JBFormViewAdapterInverseReferenceStrategy.prototype.afterSaveTasks = function(id){
        this.parentId = id;
        return this.formView.makeSaveRequest().then(function(){
            return id;
        });
    };

    JBFormViewAdapterInverseReferenceStrategy.prototype.beforeSaveTasks = function(){};

    JBFormViewAdapterInverseReferenceStrategy.prototype.getReferencingFieldName = function(){
        return this.optionsData.remote.property;
    };
    /**
     * Extracts the id of the nested object and extracts the data the form view has to distribute.
     * @todo: how should this work if there is no entity!! check that
     * @param data
     */
    JBFormViewAdapterInverseReferenceStrategy.prototype.handleGetData = function(data, index){

        var   content = (data) ? data[this.formView.getEntityName()] : data
            , id
            , parentId;

        if(angular.isDefined(index)) this.itemIndex = index;

        if(content){
            if(content.length) content = this.getEntityFromData(content);
            this.hadData = content.isDummy !== true;
            parentId    = getParentId(this.parentOptionsData, data);
            id          = this.formView.getOwnId(content);
        }

        this.initialParentId = parentId;
        this.formView.setEntityId(id);
        return this.formView.distributeData(content);
    };

    JBFormViewAdapterInverseReferenceStrategy.prototype.getEntityFromData = function(data){
        return data[this.itemIndex];
    };

    // @todo: check for aliases
    JBFormViewAdapterInverseReferenceStrategy.prototype.getSelectFields = function(){
        var   selects = this.formView.getSelectParameters().map(function (select) {
            return [this.formView.getEntityName(), select].join('.');
        }.bind(this));
        return selects;
    };

    JBFormViewAdapterInverseReferenceStrategy.prototype.isValid = function(){
        // add the referenced property name to the selects
        return this.formView.isValid();
    };

    JBFormViewAdapterInverseReferenceStrategy.prototype.getSaveCalls = function(){
        return [];
    };

    JBFormViewAdapterInverseReferenceStrategy.prototype.getEndpoint = function(parentId){
        return [
            this.optionsData.name
            , this.formView.getEntityId()
            , this.parentOptionsData.resource
            , parentId
        ].join('/');
    };

    function JBFormViewMappingStrategy(formView, $q, api, scope){
        this.formView           = formView;
        this.optionsData        = null;
        this.initialParentId    = null;
        this.parentId           = null;
        this.parentOptionsData  = null;
        this.rootEntity         = null;
        this.itemIndex          = 0;
        this.$q                 = $q;
        this.api                = api;
        this.hadData            = false;
        this.setupListeners(scope);
    }

    JBFormViewMappingStrategy.prototype.setupListeners = function(scope){
        scope.$on('deletedDetailView', function(event){
            var currentScope = event.currentScope;
            event.stopPropagation();
            this.deleteRelation()
                .then(function(){
                    currentScope.$parent.$emit('removeElement', this.itemIndex);
                }.bind(this),
                function(error){
                    console.error(error);
                });
        }.bind(this));
    };

    JBFormViewMappingStrategy.prototype.handleOptionsData = function(data){
        this.optionsData        = this.formView.getSpecFromOptionsData(data);
        this.parentOptionsData  = data;
        this.rootEntity         = data.resource;
        return this.formView.getOptionsData();
    };

    /**
     * 1. Extract the data from the get call (usually invoked by a components registry passing in an index)
     * 2. Get the id from the parent entity (used to create the mapping)
     * 3. Get the id from the child entity
     * 4. Set the id on the detail view
     * 5. Distribute the data
     *
     * @todo: use the accessor name to extract the data instead of the entity name
     * @param data
     * @param index
     */
    JBFormViewMappingStrategy.prototype.handleGetData = function(data, index){

        var   content = (data) ? data[this.formView.getEntityName()] : data
            , id
            , parentId;

        if(angular.isDefined(index)) this.itemIndex = index;

        if(content){
            if(content.length) content = this.getEntityFromData(content);
            this.hadData    = content.isDummy !== true;
            parentId        = getParentId(this.parentOptionsData, data);
            id              = this.formView.getOwnId(content);
        }

        this.initialParentId = parentId;
        this.formView.setEntityId(id);

        return this.formView.distributeData(content);
    };

    JBFormViewMappingStrategy.prototype.getEntityFromData = function(data){
        return data[this.itemIndex];
    };

    JBFormViewMappingStrategy.prototype.isValid = function(){
        return this.formView.isValid();
    };

    /**
     * @todo: take the relation name instead of the entity name
     * @returns {Array}
     */
    JBFormViewMappingStrategy.prototype.getSelectFields = function(){
        return this.formView.getSelectParameters().map(function (select) {
            return [this.optionsData.name, select].join('.');
        }.bind(this));
    };

    JBFormViewMappingStrategy.prototype.afterSaveTasks = function(id) {
      this.parentId = id;
      return this.formView
        .makeSaveRequest()
        .then(function() {
          return this.createRelation(id);
        }.bind(this))
        .then(function() { return id; });
    };

    JBFormViewMappingStrategy.prototype.createRelation = function(parentId){
        // the relation already existed
        if(this.hadData)  return this.$q.when();
        return this.api.post(this.getEndpoint(parentId));
    };

    JBFormViewMappingStrategy.prototype.getEndpoint = function(parentId){
        return [
              this.optionsData.name
            , this.formView.getEntityId()
            , this.parentOptionsData.resource
            , parentId
        ].join('/');
    };

    JBFormViewMappingStrategy.prototype.beforeSaveTasks = function(){};

    JBFormViewMappingStrategy.prototype.getSaveCalls = function(){
        return [];
    };

    JBFormViewMappingStrategy.prototype.deleteRelation = function() {
        if(!this.initialParentId || this.formView.isNew() || !this.hadData) return this.$q.when();
        return this.api.delete(this.getEndpoint(this.initialParentId));
    };

    /**
     * Inverse Reference (belongs to) handling for nested form views.
     *
     * @todo: in the future we probably need to be able to pick a certain element out of the collection (itemIndex)
     *
     * @param formView
     * @constructor
     */

    function JBFormViewAdapter($q, formView, api, scope){
        this.optionsData    = null;
        this.$q             = $q;
        this.formView       = formView;
        this.strategy       = null;
        this.api            = api;
        this.scope          = scope;
    }

    JBFormViewAdapter.prototype.getSaveCalls = function(){
        return this.strategy.getSaveCalls();
    };

    JBFormViewAdapter.prototype.registerAt = function(parent){
        parent.registerOptionsDataHandler(this.handleOptionsData.bind(this));
        parent.registerGetDataHandler(this.handleGetData.bind(this));
    };

    JBFormViewAdapter.prototype.unregisterAt = function(parent){
        parent.unregisterOptionsDataHandler(this.handleOptionsData);
        parent.unregisterGetDataHandler(this.handleGetData);
    };

    /**
     * 1. reference:    instantiate a reference strategy
     * 2. belongsTo:    instantiate an inverse reference strategy
     * @todo: properly extract the options data by taking aliases into account
     * @todo: switch into an error state if there are no options data
     */
    JBFormViewAdapter.prototype.handleOptionsData = function(data){
        // the extraction of the options data works as long as there is no alias!
        var spec = this.formView.getSpecFromOptionsData(data);
        if(!spec) {
            return console.error('No options data found for form-view %o in %o', this.formView.entityName, this.formView);
        }

        this.strategy = this.createViewAdapterStrategy(spec);
        return this.strategy.handleOptionsData(data);
    };

    JBFormViewAdapter.prototype.createViewAdapterStrategy = function(options){
        switch(options.type){
            case 'hasManyAndBelongsToMany':
                return new JBFormViewMappingStrategy(this.formView, this.$q, this.api, this.scope);
            case 'hasMany':
                return new JBFormViewAdapterInverseReferenceStrategy(this.formView, this.$q, this.api, this.scope);
            case 'hasOne':
            default:
                return new JBFormViewAdapterReferenceStrategy(this.formView, this.$q, this.api, this.scope);
        }
    };

    /**
     * 1. reference:    pass the data
     * 2. belongsTo:    pass the first object
     */
    JBFormViewAdapter.prototype.handleGetData = function(data, index){
        return this.strategy.handleGetData(data, index);
    };

    /**
     * 1. reference:    initialize the saving
     * 2. belongsTo:    do nothing
     */
    JBFormViewAdapter.prototype.beforeSaveTasks = function(){
        return this.strategy.beforeSaveTasks();
    };

    /**
     * 1. reference:    do nothing (id is set in the save calls)
     * 2. belongsTo:    initialize the saving but add a save call which sets the related id
     */
    JBFormViewAdapter.prototype.afterSaveTasks = function(id){
        return this.strategy.afterSaveTasks(id);
    };

    JBFormViewAdapter.prototype.getSelectFields = function(){
        return this.strategy.getSelectFields();
    };

    JBFormViewAdapter.prototype.isValid = function(){
        return this.formView.isReadonly || (this.strategy && this.strategy.isValid());
    };

    _module.factory('JBFormViewAdapterService', [
          '$q'
        , 'APIWrapperService'
        , function($q, api){
            return {
                getAdapter : function(formView, scope){
                    return new JBFormViewAdapter($q, formView, api, scope);
                }
            }
        }]);
})();