/**
 * New reference component.
 *
 * The relation input forces us to set the entity url during the rendering of the template, which means we have to postpone
 * the rendering and recompile as soon as we
 */
(function (undefined) {

	/* global angular */

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
					/**
					* Must be a filter, e.g. identifier='event'. First match will be taken.
					*/
					, 'defaultValue'    : '@'

					/**
					* Service name, if available. Used to prefix url (e.g. shop.inventory)
					*/
					, 'serviceName'		: '@'

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
					, 'currentData'         : '=?relationModel'

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
	function JBFormReferenceController($scope, $attrs, $compile, $templateCache, componentsService, relationService, apiWrapper) {

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
		this._api 					= apiWrapper;

		// Watch changes of defaultValue; get data on change.
		// Also watch changes of relationName as relationName must be set before we can create the 
		// needed fake object (see getDefaultValue())
		$scope.$watch(function() { return this.defaultValue; }.bind(this), function() {
			if (!this.defaultValue) return;
			this.getDefaultValue();
		}.bind(this));

	}

	JBFormReferenceController.prototype.preLink = function () {};

	JBFormReferenceController.prototype.postLink = function (scope, element) {
		if(angular.isUndefined(this.showLabel)) this.showLabel = true;
		this.subcomponentsService.registerComponent(scope, this);
		this.element = element;
	};


	JBFormReferenceController.prototype.getEntityUrl = function() {
		var url = (this.serviceName && this.serviceName !== 'legacy') ? this.serviceName + '.' : '';
		url += this.entityName;
		//console.log('JBFormReferenceController: url is %o', url);
		return url;
	};


	/**
	* Request default value, if set. Then call getDataHandler – but only if it isn't set.
	*/
	JBFormReferenceController.prototype.getDefaultValue = function() {

		// Real data is available: Don't event request the default.
		if (this.currentData && this.currentData.length) return;

		var self = this;
		console.log('JBFormReferenceController: Get default value from entity %o, filter %o', self.entityName, self.defaultValue);

		return this._api.request({
				url			: self.serviceName ? self.serviceName + '.' + self.entityName : self.entityName
				, headers	: {
					filter	: self.defaultValue
				}
			})
			.then(function(result) {

				if (!result || !result.length) {
					console.log('JBFormReferenceController: Could not get default value for entity %o, filter %o', self.entityName, self.defaultValue);
					return;
				}

				// Real data is available.
				if (self.currentData && self.currentData.length) return;

				// Update model
				console.log('JBFormReferenceController: Update model with default value %o', result);

				// defaultValueData will be handled in this.handleGetData if it has not yet been
				// called
				self.defaultValueData = result;

				// handleGetData was already called (sets isWatchingForCallback)
				// Update currentData as changes are being watched
				if (self.isWatchingForCallback) {
					this.currentData = this.defaultValueData;
				}

			});

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

	/*JBFormReferenceController.prototype.getEndpoint = function () {
		return this.entityName;
	};*/

	// @todo: catch it if the options are not found
	// @todo: make this method abstract and implement it for the reference as well as the relation

	JBFormReferenceController.prototype.handleGetData = function (data) {

		// If data is empty, don't update currentData. Needed especially for defaultValue: 
		// We don't want to update the defaultValue with [] if data is empty.
		// Dummy data (see jub-form-view or ask @Rüfe)
		var isEmptyData = data.isDummy;
		// Non-value
		isEmptyData = isEmptyData || !data || !data[this.relationName];
		// Empty array
		isEmptyData = isEmptyData || (Array.isArray(data[this.relationName]) && !data[this.relationName].length);


		this.currentData = [];

		if (!isEmptyData) {
			var selectedData = data[this.relationName];
			if(!angular.isArray(selectedData)){
				selectedData = [selectedData];
			}
			this.currentData = selectedData;
		}
	
		this.originalData = angular.copy(this.currentData);


		// GET data is empty, but default is present (set *after* originalData was stored as it represents
		// a change!)
		if (isEmptyData && this.defaultValueData) this.currentData = this.defaultValueData;


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
		return this.options && !this.isRequired() && this.options.permissions && (this.options.permissions.deleteRelation === true || this.options.permissions.deleteOneRelation === true);
	};

	JBFormReferenceController.prototype.isCreatable = function(){
		// When data is missing, assume creatability
		if (!this.options || !this.options.permissions) return true;
		return this.options.permissions.createRelation === true;
	};

	JBFormReferenceController.prototype.getLabel = function () {
		if (this.label) return this.label;
		return this.propertyName;
	};

	JBFormReferenceController.prototype.getSelectFields = function () {
		var   selectFields   = this.relationService.extractSelectFields(this.getSuggestionTemplate())
			, prefixedFields;

		//console.error(this);

		prefixedFields = selectFields.map(function (field) {

			var prefixed = '';
			if (this.serviceName) prefixed += this.serviceName + ':';
			prefixed += this.relationName + '.' + field;
			return prefixed;

		}, this);

		if(this.propertyName) prefixedFields.unshift(this.propertyName);

		return prefixedFields;
	};

	JBFormReferenceController.prototype.isRequired = function () {
		const currentParentOption = this.parentOptions && this.parentOptions.properties ? this.parentOptions.properties.find((property) => property.name === this.propertyName) : undefined;
		if (!currentParentOption) return false;
		return currentParentOption.nullable !== true;
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


















	function JBFormRelationController($scope, $attrs, $compile, $templateCache, componentsService, relationService, apiWrapper){
		JBFormReferenceController.call(this, $scope, $attrs, $compile, $templateCache, componentsService, relationService, apiWrapper);
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
						  path       : (this.serviceName && this.serviceName !== 'legacy' ? this.serviceName + '.' : '') + [ this.relationName, value].join('/')
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
					  path       : (this.serviceName && this.serviceName !== 'legacy' ? this.serviceName + '.' : '') + this.relationName + '/' + value
					, mainEntity : 'append'
				}
			});
		}, this);

		console.log('JBFormRelationController: getSaveCalls for %s returns %o', this.entityName, calls);
		return calls;

	};

	/*JBFormRelationController.prototype.getSelectFields = function () {
		var   selectFields   = this.relationService.extractSelectFields(this.getSuggestionTemplate())
			, prefixedFields;

		prefixedFields = selectFields.map(function (field) {
			return [this.relationName, field].join('.');
		}, this);

		return prefixedFields;
	};*/
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


	/**
	* Relations are never required (is that true)?
	*/
	JBFormRelationController.prototype.isRequired = function(fieldSpecs) {
		return false;
	};


	_module.controller('JBFormReferenceController', [
		  '$scope'
		, '$attrs'
		, '$compile'
		, '$templateCache'
		, 'JBFormComponentsService'
		, 'RelationInputService'
		, 'APIWrapperService'
		, JBFormReferenceController
	]);

	_module.controller('JBFormRelationController', [
		  '$scope'
		, '$attrs'
		, '$compile'
		, '$templateCache'
		, 'JBFormComponentsService'
		, 'RelationInputService'
		, 'APIWrapperService'
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
						'relation-entity-endpoint="{{$ctrl.getEntityUrl()}}" ' +
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