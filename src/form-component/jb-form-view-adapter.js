(function (undefined) {

    'use strict';

    var _module = angular.module('jb.formComponents');

    function JBFormViewAdapterReferenceStrategy(formView){
        this.formView    = formView;
        this.optionsData = null;
        this.initialId   = null;
        this.parentOptionsData = null;
    }

    JBFormViewAdapterReferenceStrategy.prototype.handleOptionsData = function(data){
        this.optionsData        = this.formView.getSpecFromOptionsData(data);
        return this.formView.getOptionsData();
    };

    JBFormViewAdapterReferenceStrategy.prototype.beforeSaveTasks = function(){
        return this.formView.makeSaveRequest();
    };

    JBFormViewAdapterReferenceStrategy.prototype.getReferencingFieldName = function(){
        return this.optionsData.relationKey;
    };
    /**
     * Extracts the id of the nested object and extracts the data the form view has to distribute.
     * @param data
     */
    JBFormViewAdapterReferenceStrategy.prototype.handleGetData = function(data){
        var   id      = data[this.getReferencingFieldName()]
            , content = data[this.formView.getEntityName()];

        this.initialId = id;
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

    /**
     * Inverse Reference (belongs to) handling for nested form views.
     *
     * @todo: in the future we probably need to be able to pick a certain element out of the collection (itemIndex)
     *
     * @param formView
     * @constructor
     */
    function JBFormViewAdapterInverseReferenceStrategy(formView){
        this.formView           = formView;
        this.optionsData        = null;
        this.initialParentId    = null;
        this.parentId           = null;
        this.parentOptionsData  = null;
        this.itemIndex          = 0;
        this.initialize(formView);
    }

    /**
     * This one should add the save call at the form-view.
     * @todo: add a validator which checks if the reference to the parent form-view is required!
     * @param formView
     */
    JBFormViewAdapterInverseReferenceStrategy.prototype.initialize = function(formView){
        var self = this;
        formView.registerComponent({
              registerAt:   function(parent){}
            , isValid:      function(){}
            /**
             * @todo: set the parent id in the emitted post save task
             */
            , getSaveCalls: function(){
                var call = { data: {} };
                if(self.initialParentId == self.parentId) return [];
                call[ self.getReferencingFieldName() ] = this.parentId;
                return [ call ];
            }
        });
    };

    JBFormViewAdapterInverseReferenceStrategy.prototype.handleOptionsData = function(data){
        this.optionsData = this.formView.getSpecFromOptionsData(data);
        this.parentOptionsData  = data;
        return this.formView.getOptionsData();
    };

    /**
     * @todo: move this to the `afterSaveTasks`
     * @todo: set the entity id on the current detail view (is this possible?)
     */
    JBFormViewAdapterInverseReferenceStrategy.prototype.afterSaveTasks = function(id){
        this.parentId = id;
        return this.formView.makeSaveRequest();
    };

    JBFormViewAdapterInverseReferenceStrategy.prototype.beforeSaveTasks = function(){};

    JBFormViewAdapterInverseReferenceStrategy.prototype.getReferencingFieldName = function(){
        return this.optionsData.relationKey;
    };
    /**
     * Extracts the id of the nested object and extracts the data the form view has to distribute.
     * @todo: how should this work if there is no entity!! check that
     * @param data
     */
    JBFormViewAdapterInverseReferenceStrategy.prototype.handleGetData = function(data){

        var   content = (data) ? data[this.formView.getEntityName()] : data
            , id
            , parentId
            , parentIdKey;

        if(content){
            if(content.length) content = this.getEntityFromData(content);
            parentIdKey = this.formView.getIdFieldFrom(this.parentOptionsData);
            id          = this.formView.getOwnId(content);
            parentId    = data[ parentIdKey ];
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

    function JBFormViewAdapter($q, formView){
        this.optionsData    = null;
        this.$q             = $q;
        this.formView       = formView;
        this.strategy       = null;
    }

    JBFormViewAdapter.prototype.getSaveCalls = function(){
        return this.strategy.getSaveCalls();
    };

    JBFormViewAdapter.prototype.registerAt = function(parent){
        parent.registerOptionsDataHandler(this.handleOptionsData.bind(this));
        parent.registerGetDataHandler(this.handleGetData.bind(this));
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
        if(!spec) return console.error('No options data found for form-viwe %o', this.formView);

        this.strategy = this.createViewAdapterStrategy(spec);
        return this.strategy.handleOptionsData(data);
    };

    JBFormViewAdapter.prototype.createViewAdapterStrategy = function(options){

        switch(options.originalRelation){
            case 'belongsTo':
                return new JBFormViewAdapterInverseReferenceStrategy(this.formView);
            case 'hasOne':
            default:
                return new JBFormViewAdapterReferenceStrategy(this.formView);
        }
    };

    /**
     * 1. reference:    pass the data
     * 2. belongsTo:    pass the first object
     */
    JBFormViewAdapter.prototype.handleGetData = function(data){
        return this.strategy.handleGetData(data);
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
        return this.strategy && this.strategy.isValid();
    };

    _module.factory('JBFormViewAdapterService', [
          '$q'
        , function($q){
            return {
                getAdapter : function(formView){
                    return new JBFormViewAdapter($q, formView);
                }
            }
        }]);
})();