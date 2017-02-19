/**
 * New reference component.
 *
 * The relation input forces us to set the entity url during the rendering of the template, which means we have to postpone
 * the rendering and recompile as soon as we
 */
(function (undefined) {

    'use strict';

    var _module = angular.module('jb.formComponents');
    /*
     Get these fuckers from the options call.

     , deletable             : '<?relationIsDeletable'
     , creatable             : '<?relationIsCreatable' */

    function createBaseDirective(controller){
        return function() {
            return {
                  controller        : controller
                , controllerAs      : '$ctrl'
                , bindToController  : true
                , link: {
                    pre: function (scope, element, attrs, ctrl) {
                        ctrl.preLink(scope, element, attrs);
                    }
                    , post: function (scope, element, attrs, ctrl) {
                        ctrl.hasLabel = attrs.hasOwnProperty('label');
                        ctrl.hasModel = attrs.hasOwnProperty('relationInputModel');
                        ctrl.enableFulltext = attrs.hasOwnProperty('relationEnableFulltextSearch');
                        ctrl.postLink(scope, element, attrs);
                    }
                }
                , scope: {
                      'propertyName'    : '@for'
                    , 'entityName'      : '@entity'
                    , 'relationName'    : '@relation'

                    , 'label'           : '@?'
                    , 'showLabel'		: '<?'

                    , 'suggestion'      : '@suggestionTemplate'
                    , 'searchField'     : '@'
                    , 'changeHandler'   : '&'
                    , 'filters'         : '<'

                    , 'isInteractive'		: '<?relationIsInteractive'
                    , 'disableRemoveButton'	: '<?relationDisableRemoveButton'
                    , 'disableNewButton'	: '<?relationDisableNewButton'
                    , 'disableEditButton'   : '<?relationDisableEditButton'
                    , 'model'               : '=?relationModel'

                    , 'isReadonly'          : '<?relationIsReadonly'
                    , 'enableFulltextSearch': '<?relationEnableFulltextSearch'

                    , 'resultCount'         : '<?relationResultCount'
                }
            };
        };
    }

    _module.directive('jbFormReferenceComponent' , [createBaseDirective('JBFormReferenceController')]);
    _module.directive('jbFormRelationComponent'  , [createBaseDirective('JBFormRelationController')]);

    /**
     * Controller which handles the reference to an entity. Currently used as super-controller, but we should change that.
     *
     * @param $scope
     * @param $attrs
     * @param $compile
     * @param $templateCache
     * @param componentsService
     * @param relationService
     * @constructor
     */
    function JBFormReferenceController($scope, $attrs, $compile, $templateCache, componentsService, relationService) {
        this.subcomponentsService   = componentsService;
        this.options                = null;
        this.originalData           = [];
        this.suggestion             = '';
        this.relationService        = relationService;
        this.$scope                 = $scope;
        this.$compile               = $compile;
        this.$templateCache         = $templateCache;
        this.element                = null;
        this.currentData            = [];
        this.referencedPropertyName = null;
        this.relationTypes          = ['hasOne'];
        this.rendered               = false;
        this.isWatchingForCallback  = false;
        this.isMultiSelect          = false;
        this.parentOptions          = null;
    }

    JBFormReferenceController.prototype.preLink = function () {};

    JBFormReferenceController.prototype.postLink = function (scope, element, attrs) {
        if(angular.isUndefined(this.showLabel)) this.showLabel = true;
        this.subcomponentsService.registerComponent(scope, this);
        this.element = element;
    };

    JBFormReferenceController.prototype.displayLabel = function(){
        return this.hasLabel && this.showLabel !== false;
    };

    JBFormReferenceController.prototype.registerAt = function (parent) {
        parent.registerOptionsDataHandler(this.handleOptionsData.bind(this));
        parent.registerGetDataHandler(this.handleGetData.bind(this));
    };

    JBFormReferenceController.prototype.unregisterAt = function (parent) {
        parent.unregisterOptionsDataHandler(this.handleOptionsData);
        parent.unregisterGetDataHandler(this.handleGetData);
    };

    JBFormReferenceController.prototype.getEndpoint = function () {
        return this.entityName;
    };

    // @todo: catch it if the options are not found
    // @todo: make this method abstract and implement it for the reference as well as the relation

    JBFormReferenceController.prototype.handleGetData = function (data) {
        this.currentData = [];
        if (data && data[this.relationName]) {
            var selectedData = data[this.relationName];
            if(!angular.isArray(selectedData)){
                selectedData = [selectedData];
            }
            this.currentData = selectedData;
        }
        this.originalData = angular.copy(this.currentData);
        if(!this.isWatchingForCallback){
            this.$scope.$watch(
                  function(){ return this.currentData; }.bind(this)
                , function(newValue, oldValue){
                    if(this.changeHandler) this.changeHandler({ newValue: newValue , oldValue: oldValue });
                }.bind(this));
            this.isWatchingForCallback = true;
        }
        console.log('BackofficeReferenceComponentController: Model updated (updateData) to %o', this.currentData);
    };

    // @todo: make this method abstract and implement it for reference as well as relation
    JBFormReferenceController.prototype.getSpec = function(data){

        var   relations = (data && data.relations) ? data.relations : []
            , relation;

        if(!relations.length) return;

        for(var i=0; i<relations.length; i++){
            relation = relations[i];
            if(this.relationTypes.indexOf(relation.type) === -1)                continue;
            if(relation.property && this.propertyName === relation.property)    return relation;
            if(relation.name && this.relationName === relation.name)            return relation;
            if(relation.remote.resource && this.entityName === relation.name)   return relation;
        }

        return;
    };

    JBFormReferenceController.prototype.handleOptionsData = function (data) {
        if(this.rendered === true) return;

        var   fieldSpec    = this.getSpec(data);

        if (!angular.isDefined(fieldSpec)) {
            return console.error(
                'JBFormRelationComponent: No options data found for name %o referencing entity %o or relation %o in data %o.'
                , this.propertyName
                , this.entityName
                , this.relationName
                , data);
        }
        this.parentOptions = data;
        if(this.adaptToSpec(fieldSpec)) {
            return this.renderComponent();
        }
    };

    JBFormReferenceController.prototype.adaptToSpec = function(fieldSpec) {
        this.propertyName           = fieldSpec.property;
        this.entityName             = fieldSpec.remote.resource;
        this.relationName           = fieldSpec.name;
        this.referencedPropertyName = fieldSpec.remote.property;
        this.options                = fieldSpec;

        return true;
    };

    /**
     * Renders the current directive by modifying the template and recompiling the content of the current component.
     *
     * This is a rather hacky way of injecting the content but sadly the 'relation-input' directive does not properly
     * access/evaluate all of its parameters and therefore not all values are correctly interpreted if inserted using
     * bindings within the template.
     */
    JBFormReferenceController.prototype.renderComponent = function(){
        // This happens synchronously, and is therefore not a problem
        var template = angular.element(this.$templateCache.get('referenceComponentTemplate.html'));
        this.$compile( template )( this.$scope );
        this.element.prepend( template );
        this.rendered = true;
    };

    JBFormReferenceController.prototype.addModelTransformations = function(template){
        return template.attr('sanitize-model', true);
    };

    JBFormReferenceController.prototype.isInteractive = function(){
        console.info(this.interactive);
        return angular.isDefined(this.interactive) ? this.interactive : true;
    };

    JBFormReferenceController.prototype.isDeletable = function(){
        return this.options && !this.isRequired() && this.options.permissions && this.options.permissions.deleteRelation === true;
    };

    JBFormReferenceController.prototype.isCreatable = function(){
        return this.options && this.options.permissions && this.options.permissions.createRelation === true;
    };

    JBFormReferenceController.prototype.getLabel = function () {
        if (this.label) return this.label;
        return this.propertyName;
    };

    JBFormReferenceController.prototype.getSelectFields = function () {
        var   selectFields   = this.relationService.extractSelectFields(this.getSuggestionTemplate())
            , prefixedFields;

        prefixedFields = selectFields.map(function (field) {
            return [this.relationName, field].join('.');
        }, this);

        if(this.propertyName) prefixedFields.unshift(this.propertyName);

        return prefixedFields;
    };

    JBFormReferenceController.prototype.isRequired = function () {
        if (!this.options) return true;
        return this.options.nullable === true;
    };

    JBFormReferenceController.prototype.getSuggestionTemplate = function () {
        return this.suggestion;
    };

    JBFormReferenceController.prototype.getSearchField = function(){
        return this.searchField;
    };

    JBFormReferenceController.prototype.isValid = function(){
        if(this.isRequired()) return this.currentData.length > 0;
        return true;
    };

    JBFormReferenceController.prototype.getSaveCalls = function(){

        var   currentModel      = this.currentData[0]
            , originalModel     = this.originalData[0]
            , currentProperty
            , originalProperty;

        if(currentModel) currentProperty = currentModel[this.referencedPropertyName];
        if(originalModel) originalProperty = originalModel[this.referencedPropertyName];

        console.log('JBFormReferenceController: current model is %o, original %o; currentProperty %o, originalProperty %o', currentModel, originalModel, currentProperty, originalProperty);

        /**
         * This check is sufficient to detect if:
         *   - the reference was removed (currentProperty === undefined)
         *   - the reference has changed
         *   - the reference was added   (originalProperty === undefined)
         */
        if(originalProperty !== currentProperty){
            var saveCall = {
                data: {}
            };
            /**
             * Set the original propertyName, i.e. the foreign key property (e.g id_city).
             * @note: To reset the property we have to pass the empty string.
             */
            saveCall.data[this.propertyName] = angular.isDefined(currentProperty) ? currentProperty : '';
            return [saveCall];
        }

        return [];
    };

    function JBFormRelationController($scope, $attrs, $compile, $templateCache, componentsService, relationService){
        JBFormReferenceController.call(this, $scope, $attrs, $compile, $templateCache, componentsService, relationService);
        this.relationTypes = ['hasMany', 'hasManyAndBelongsToMany'];
        this.isMultiSelect = true;
    }

    /**
     *
     * @type {JBFormReferenceController}
     */
    JBFormRelationController.prototype = Object.create(JBFormReferenceController.prototype);
    JBFormRelationController.prototype.constructor = JBFormRelationController;

    /**
     * @todo: this might be implemented as a post-save call to ensure that the original entity was saved
     * @todo: remove the workaround for content data on delete requests
     * @returns {*}
     */
    JBFormRelationController.prototype.getSaveCalls = function(){

        var   currentProperties  = this.mapProperties(this.currentData, this.propertyName)
            , calls;

        // check for items that are present in the original data and the current data
        calls = this.originalData.reduce(function(removeCalls, item){
            var value = item[this.propertyName];
            if(angular.isDefined(currentProperties[value])){
                // defined in both
                delete currentProperties[value];
            } else {
                // otherwise it is only defined in the the originalData and is therefore removed
                removeCalls.push({
                    method    : 'DELETE'
                    , url       : {
                          path       : [ this.relationName, value].join('/')
                        , mainEntity : 'append'
                    }
                });
            }
            return removeCalls;
        }.bind(this), []);
        // newly added items are all the items that remain in the current properties map
        Object.keys(currentProperties).forEach(function(value){
            calls.push({
                  method    : 'POST'
                , url       : {
                      path       : [ this.relationName, value].join('/')
                    , mainEntity : 'append'
                }
            });
        }, this);
        return calls;
    };

    JBFormRelationController.prototype.getSelectFields = function () {
        var   selectFields   = this.relationService.extractSelectFields(this.getSuggestionTemplate())
            , prefixedFields;

        prefixedFields = selectFields.map(function (field) {
            return [this.relationName, field].join('.');
        }, this);

        return prefixedFields;
    };
    /**
     * Creates a map between the value of a specific property and the item within a collection of items (assuming that
     * the properties are unique).
     *
     * @param collection
     * @param property
     * @returns {{values: Array, map: {}}}
     */
    JBFormRelationController.prototype.mapProperties = function(collection, property){
        return collection.reduce(function(map, item){
            map[item[property]] = item;
            return map;
        }, {});
    };

    JBFormRelationController.prototype.rateSpec = function(relation){
        var rating = 0;
        if(this.relationTypes.indexOf(relation.type) === -1)                return rating;
        //if(relation.property && this.propertyName === relation.property)    rating++;
        if(relation.name && this.relationName === relation.name)            		   rating++;
        if(relation.remote.resource && this.entityName === relation.remote.resource)   rating++;

        return rating;
    };

    JBFormRelationController.prototype.getSpec = function(data){

        var   relations = (data && data.relations) ? data.relations : []
            , ratedSpecs
            , maxRating = 0;

        if(!relations.length) return;

        ratedSpecs = relations.reduce(function(ratings, relation){
            var rating = this.rateSpec(relation);
            if(!ratings[rating]) ratings[rating] = [];
            ratings[rating].push(relation);
            maxRating = Math.max(maxRating, rating);
            return ratings;
        }.bind(this), {});

        if(maxRating === 0) return;
        return ratedSpecs[maxRating];
    };

    JBFormRelationController.prototype.adaptToSpec = function(fieldSpecs) {

        if(fieldSpecs.length !== 1){
            console.error(
                  'JBFormRelationController: the relation to entity %o using accessor (relation) %o does not seem to be unique and has multiple possible relations %o'
                , this.entityName
                , this.relationName
                , fieldSpecs
            );
            return false;
        }

        return JBFormReferenceController.prototype.adaptToSpec.call(this, fieldSpecs[0]);
    };

    _module.controller('JBFormReferenceController', [
          '$scope'
        , '$attrs'
        , '$compile'
        , '$templateCache'
        , 'JBFormComponentsService'
        , 'RelationInputService'
        , JBFormReferenceController
    ]);

    _module.controller('JBFormRelationController', [
          '$scope'
        , '$attrs'
        , '$compile'
        , '$templateCache'
        , 'JBFormComponentsService'
        , 'RelationInputService'
        , JBFormRelationController
    ]);

    _module.run(['$templateCache', function ($templateCache) {
        $templateCache.put('referenceComponentTemplate.html',
            '<div class="form-group">' +
                '<label jb-form-label-component ' +
                        'label-identifier="{{$ctrl.getLabel()}}" ' +
                        'is-required="$ctrl.isRequired()" ' +
                        'is-valid="$ctrl.isValid()" ' +
                        'ng-if="$ctrl.displayLabel()">' +
                '</label>' +
                '<div class="relation-select" ' +
                        'relation-input ' +
                        'ng-class="{ \'col-md-9\' : $ctrl.displayLabel() , \'col-md-12\' : !$ctrl.displayLabel() }" ' +
                        'ng-model="$ctrl.currentData" ' +
                        'relation-entity-endpoint="{{$ctrl.entityName}}" ' +
                        'relation-suggestion-template="{{$ctrl.suggestion}}" ' +
                        'relation-search-field="{{$ctrl.searchField}}" ' +

                        'relation-disable-remove-button="$ctrl.disableRemoveButton" ' +
                        'relation-disable-new-button="$ctrl.disableNewButton" ' +
                        'relation-disable-edit-button="$ctrl.disableEditButton" ' +

                        'relation-is-deletable="$ctrl.isDeletable()" ' +
                        'relation-is-creatable="$ctrl.isCreatable()" ' +
                        'relation-enable-fulltext-search="$ctrl.enableFulltext" ' +

                        'relation-result-count="$ctrl.resultCount " ' +
                        'relation-is-readonly="$ctrl.isReadonly" ' +
                        'relation-is-multi-select="$ctrl.isMultiSelect" ' +
                        'relation-filter="$ctrl.filters" ' +
                        'relation-is-interactive="$ctrl.isInteractive"> ' +
                '</div>' +
            '</div>');
    }]);
})();