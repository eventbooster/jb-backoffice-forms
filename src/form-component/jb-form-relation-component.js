/**
 * New reference component.
 *
 * The relation input forces us to set the entity url during the rendering of the template, which means we have to postpone
 * the rendering and recompile as soon as we
 */
(function (undefined) {

	'use strict';

	var _module = angular.module('jb.formComponents');

	function createBaseDirective(controller){
		return function() {
			return {
				controller: controller
				, controllerAs: '$ctrl'
				, bindToController: true
				, link: {
					pre: function (scope, element, attrs, ctrl) {
						ctrl.preLink(scope, element, attrs);
					}
					, post: function (scope, element, attrs, ctrl) {
						ctrl.postLink(scope, element, attrs);
					}
				}
				, scope: {
					  'propertyName'    : '@for'
					, 'entityName'      : '@entity'
					, 'relationName'    : '@relation'
					, 'label'           : '@'
					, 'suggestion'      : '@suggestionTemplate'
					, 'searchField'     : '@'
					, 'changeHandler'   : '&'
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
		this.entities               = [];
	}

	JBFormReferenceController.prototype.preLink = function () {};

	JBFormReferenceController.prototype.postLink = function (scope, element, attrs) {
		this.subcomponentsService.registerComponent(scope, this);
		this.element = element;
	};

	JBFormReferenceController.prototype.registerAt = function (parent) {
		parent.registerOptionsDataHandler(this.handleOptionsData.bind(this));
		parent.registerGetDataHandler(this.handleGetData.bind(this));
	};

	JBFormReferenceController.prototype.getEndpoint = function () {
		return this.relationName;
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
		this.$scope.$watch(
			function(){ return this.currentData; }.bind(this)
			, function(newValue, oldValue){
				if(this.changeHandler) this.changeHandler({ newValue: newValue , oldValue: oldValue });
			}.bind(this));
		console.log('BackofficeReferenceComponentController: Model updated (updateData) to %o', this.currentData);
	};

	// @todo: make this method abstract and implement it for reference as well as relation
	JBFormReferenceController.prototype.getSpec = function(data){

		var   spec
			, hasInternalReferences;

		// No data available
		if(!data) return spec;

		// If the references are listed separately
		hasInternalReferences = angular.isDefined(data.internalReferences);

		// the property name has the hightest priority (no fallback!!), e.g. id_city
		if(this.propertyName && hasInternalReferences) return data.internalReferences[this.propertyName];

		// the entity name has the second highest property
		if(this.entityName && hasInternalReferences) {
			// if there is a reference to the corresponding entity, we take it
			var keys = Object.keys(data.internalReferences);
			for(var i=0; i<keys.length; i++){
				var key = keys[i];
				if(data.internalReferences[key].entity == this.entityName) return data.internalReferences[key];
			}
			return spec;
		}
		// we can also just specify the relation name directly (which might be the same as the entity name)
		if(this.relationName) return data[this.relationName];
		return spec;
	};

	JBFormReferenceController.prototype.handleOptionsData = function (data) {
		var fieldSpec = this.getSpec(data);
		if (!angular.isDefined(fieldSpec)) {
			return console.error(
				'JBFormReferenceController: No options data found for name %o referencing entity %o.'
				, this.propertyName
				, this.entityName);
		}
		this.propertyName           = fieldSpec.relationKey;
		this.entityName             = fieldSpec.entity;
		this.relationName           = fieldSpec.relation;
		this.referencedPropertyName = fieldSpec.relatedKey;
		this.options                = fieldSpec;

		// Now we've got all the necessary information to render the component (this is hacky stuff).
		this.renderComponent();
	};
	JBFormReferenceController.prototype.isMultiSelect = function(){
		return false;
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
		template
			.find( '[relation-input]')
			.attr( 'relation-entity-endpoint', this.getEndpoint() )
			.attr( 'relation-interactive', this.isInteractive() )
			// deleteable is evaluated by the directive, nevertheless i don't like that since it is likely to break.
			.attr( 'deletable', '$ctrl.isDeletable()' )
			.attr( 'relation-entity-search-field', this.getSearchField() )
			.attr( 'relation-suggestion-template', this.getSuggestionTemplate() )
			.attr( 'multi-select', this.isMultiSelect() )
			.attr( 'ng-model', '$ctrl.currentData' );

		this.$compile( template )( this.$scope );
		this.element.prepend( template );
	};

	JBFormReferenceController.prototype.addModelTransformations = function(template){
		return template.attr('sanitize-model', true);
	};

	JBFormReferenceController.prototype.isInteractive = function(){
		return true;
	};

	JBFormReferenceController.prototype.isDeletable = function(){
		return true;
	};

	JBFormReferenceController.prototype.getLabel = function () {
		if (this.label) return this.label;
		return this.propertyName;
	};

	JBFormReferenceController.prototype.getSelectFields = function () {
		var   selectFields   = this.relationService.extractSelectFields(this.getSuggestionTemplate())
			, prefixedFields = selectFields.map(function (field) {
				return [this.relationName, field].join('.');
			}, this);

		if(this.propertyName) prefixedFields.unshift(this.propertyName);

		return prefixedFields;
	};

	JBFormReferenceController.prototype.isRequired = function () {
		if (!this.options) return true;
		return this.options.required === true;
	};

	JBFormReferenceController.prototype.isMultiSelect = function () {
		return false;
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
	}

	/**
	 *
	 * @type {JBFormReferenceController}
	 */
	JBFormRelationController.prototype = Object.create(JBFormReferenceController.prototype);
	JBFormRelationController.prototype.constructor = JBFormRelationController;
	JBFormRelationController.prototype.isMultiSelect = function(){
		return true;
	};

	JBFormRelationController.prototype.getSpec = function(data){
		// No data available
		if(!data) return;

		if(this.relationName) return data[this.relationName];
		return data[this.entityName];
	};
	/**
	 * @todo: this might be implemented as a post-save call to ensure that
	 * @returns {*}
	 */
	JBFormRelationController.prototype.getSaveCalls = function(){

		var   currentProperties  = this.mapProperties(this.currentData, this.referencedPropertyName)
			, calls;

		// check for items that are present in the original data and the current data
		calls = this.originalData.reduce(function(removeCalls, item){
			var value = item[this.referencedPropertyName];
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
			'<label jb-form-label-component label-identifier="{{$ctrl.getLabel()}}" is-required="$ctrl.isRequired()" is-valid="$ctrl.isValid()"></label>' +
			'<div relation-input class="relation-select col-md-9"></div>' +
			'</div>');
	}]);
})();