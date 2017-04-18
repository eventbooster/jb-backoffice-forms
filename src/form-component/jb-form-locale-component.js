(function(undefined){
	"use strict";
	/**
	 * @todo: This directive needs some refactoring!
	 */
	var _module = angular.module('jb.formComponents');

	_module.directive('jbFormLocaleComponent', function(){
		return {
			  controller        : 'JBFormLocaleComponentController'
			, controllerAs      : '$ctrl'
			, bindToController  : true
			, scope: {
				  fieldsExclude : '<'
				, languageOrder : '<'
				, fieldOrder    : '<'
				// Is mainly used to get the remote table's name (from the OPTIONS call) 
				// and to display the correct label
				, entityName    : '@entity'
				, relationName  : '@relation'
				, isReadonly    : '<'
				, model			: '=?inputModel'
				// Instead of looking up the name of the remote table through entityName,
				// we can directly pass in the remote table's name (e.g. venueLocale)
				, remoteName	: '@'
				// If the remote (and maybe the current) entity are on a service, we need to make
				// the OPTIONS call to remoteService.remoteName while the selects only use the
				// remoteName
				, remoteService	: '@'
			}
			, template: '<div class="locale-component container">' +
							'<!-- LOCALE-COMPONENT: way too many divs in here -->'+
							'<div class="row">' +
								'<div class="col-md-12">' +
									'<ul class="nav nav-tabs col-md-12">' +
										'<li ng-repeat="language in $ctrl.getSupportedLanguages()" ng-class="{active:$ctrl.isSelected(language)}">'+
											'<a href="#" ng-click="$ctrl.toggleLanguage($event, language)">'+
												'{{language.code|uppercase}}' +
												'<span data-ng-if="$ctrl.checkForTranslation(language)" class="fa fa-check"></span>' +
											'</a>'+
										'</li>'+
									'</ul>'+
								'</div>'+
							'</div>' +
							'<div class="locale-content">' +
								'<div class="locale-col locale-panel" ng-repeat="language in $ctrl.selectedLanguages" data-language-id="{{language.id}}">' +
									'<p>{{ language.code | uppercase }}</p>' +
									'<ul ng-if="$ctrl.fieldDefinitions">' +
										'<li ng-repeat="fieldName in $ctrl.fields">' +
											'<label ng-attr-for="locale-{{language.code}}-{{fieldName}}" ng-class="{ \'invalid\' : !$ctrl.fieldIsValid($ctrl.locales[ language.id ], fieldName)}">' +
												'<span data-translate="web.backoffice.{{$ctrl.entityName}}.{{fieldName}}"></span>' +
												'<span class="required-indicator" data-ng-show="fieldDefinitions[fieldName].required">*</span>' +
											'</label>' +
											'<textarea ng-model="$ctrl.locales[ language.id ][ fieldName ]" ' +
												'ng-attr-id="locale-{{language.code}}-{{fieldName}}"' +
												'class="form-control" ' +
												'ng-disabled="$ctrl.isReadonly"' +
												'ng-keyup="$ctrl.adjustHeight( $event )" ' +
												'ng-click="$ctrl.adjustHeight( $event )" />' +
											'</textarea>' +
										'</li>'+
									'</ul>' +
								'</div>' +
							'</div>' +
						'</div>'

			, link: {
				pre: function(scope, element, attrs, ctrl){
					ctrl.preLink(scope, element, attrs);
				}
				, post: function(scope, element, attrs, ctrl){
					ctrl.postLink(scope, element, attrs);
				}
			}
		};
	});
	/**
	 * @todo: remove unnecessary fuzz
	 * @todo: remove the dependency to the session service and add a provider
	 * @param $scope
	 * @param $q
	 * @param $timeout
	 * @param api
	 * @param componentsService
	 * @param sessionService
	 * @constructor
	 */
	function JBFormLocaleComponentController($scope, $q, $timeout, api, componentsService, sessionService, boAPIWrapper){
		this.$scope             = $scope;
		this.api                = api;
		this.$q                 = $q;
		this.$timeout           = $timeout;
		this.componentsService  = componentsService;
		//this.options            = null;
		this.fieldDefinitions   = null;
		// All fields that will be displayed in the fieldOrder provided
		this.fields             = [];

		// See this.normalizeModel!
		var defaultLocale		= [];
		// Fill default locales with data we'd get from the server when data is already available. 
		// Needed to fix https://github.com/joinbox/eventbooster-issues/issues/659 as we need to have an id_language
		// in every object of this.locales
		(sessionService.get('supported-languages', 'local') || []).forEach(function(language) {
			defaultLocale[language.language.id] = {
				id_language: language.language.id
			};
		});

		this.locales            = this.model || defaultLocale;
		this.model				= this.locales;

		this.originalLocales    = JSON.parse(JSON.stringify(this.locales));
		this.heightElement      = null;
		this.heightElementInitialized = false;
		this.boAPI              = boAPIWrapper;
		this.supportedLanguages = (sessionService.get('supported-languages', 'local') || []).map(function(item){
			var lang = angular.copy(item.language);
			lang.selected = false;
			return lang;
		}, this).sort(function(a, b) {
			if (!this.languageOrder || !this.languageOrder.length || !this.languageOrder[a.code] || !this.languageOrder[b.code]) return 0;
			return this.languageOrder[a.code] < this.languageOrder[b.code] ? -1 : 1;
		}.bind(this));
		this.element = null;
	}

	JBFormLocaleComponentController.prototype.preLink = function(){};
	JBFormLocaleComponentController.prototype.postLink = function(scope, element, attrs){
		this.componentsService.registerComponent(scope, this);
		this.heightElement = angular.element('<div></div>');
		this.heightElement = this.heightElement.attr('id', 'locale-height-container');
		this.heightElement.css('position', 'absolute');
		this.heightElement.css('left', '-9999px');
		this.heightElement.css('top', '-9999px');
		this.element = element;
		this.element.append(this.heightElement);
	};

	JBFormLocaleComponentController.prototype.registerAt = function(parent){
		parent.registerOptionsDataHandler(this.handleOptionsData.bind(this));
		parent.registerGetDataHandler(this.handleGetData.bind(this));
	};

	JBFormLocaleComponentController.prototype.unregisterAt = function(parent){
		parent.unregisterOptionsDataHandler(this.handleOptionsData);
		parent.unregisterGetDataHandler(this.handleGetData);
	};

	JBFormLocaleComponentController.prototype.getSelectedLanguages = function(){
		var selected = [];
		for(var i=0; i<this.supportedLanguages.length; i++){
			var lang = this.supportedLanguages[i];
			if(lang.selected === true) selected.push(lang);
		}
		return selected;
	};

	JBFormLocaleComponentController.prototype.getSupportedLanguages = function(){
		return this.supportedLanguages;
	};

	JBFormLocaleComponentController.prototype.fieldIsValid = function(locale, property){

		var   definition = this.fieldDefinitions[property];
		// fields of locales which do not yet exist are not validated
		if(!locale) return true;
		if(definition.required === true) return !this._localePropertyIsEmpty(locale[property]);
		return true;
	};

	JBFormLocaleComponentController.prototype.adjustHeight = function(event){
		var   element       = angular.element(event.currentTarget);
		this.adjustElementHeight(element);
	};

	JBFormLocaleComponentController.prototype.adjustElementHeight = function(element){

		var   scrollHeight  = element[0].scrollHeight
			, textValue     = element.val()
			, targetWidth;


		if(!this.heightElementInitialized) this.initializeHeightElement(element);

		// remove the scrollbar
		element.height(scrollHeight);
		// measure the width after the scrollbar has gone
		targetWidth = element.width();
		// set the corresponding width to the height measuring container
		this.heightElement.width(targetWidth);
		// sanitize newlines so they are correctly displayed in the height element
		textValue = textValue.replace(/(\n\r?)/g, '<br>').replace(/(\<br\>\s*)$/, '<br><br>');
		// adds the content or a placeholder text (to preserve the basic height)
		if(textValue.trim() == '') textValue = 'empty';
		// insert the content as html to be sure linebreaks are rendered correctly
		this.heightElement.html(textValue);
		// set the width
		this.heightElement.width(targetWidth);
		// port the height of the element
		element.height(this.heightElement.height());
	};

	JBFormLocaleComponentController.prototype.adjustAllHeights = function(){
		this.element.find('textarea').each(function(index, element){
			this.adjustElementHeight(angular.element(element));
		}.bind(this));
	};

	JBFormLocaleComponentController.prototype.initializeHeightElement = function(element){

		[     'font-size'
			, 'font-family'
			, 'font-weight'
			, 'letter-spacing'
			, 'line-height'
			, 'padding-top'
			, 'padding-left'
			, 'padding-right'
			, 'padding-bottom'
			, 'border-radius'
			, 'border'].forEach(function(property){
				this.heightElement.css(property, element.css(property));
			}, this);
		this.heightElement.css('word-wrap', 'break-word');
		this.heightElementInitialized = true;
	};

	JBFormLocaleComponentController.prototype.toggleLanguage = function(event, language){
		if(event) event.preventDefault();
		var langs = this.getSelectedLanguages();
		if(language){
			if(language.selected && langs.length == 1) return;
			language.selected = language.selected !== true;
		}
		this.reassignLanguages().then(this.adjustAllHeights.bind(this));
	};

	JBFormLocaleComponentController.prototype.reassignLanguages = function(){
		this.selectedLanguages = this.getSelectedLanguages();
		return this.$timeout();
	};

	JBFormLocaleComponentController.prototype.isSelected = function(language){
		return language.selected === true;
	};

	JBFormLocaleComponentController.prototype.checkForTranslation = function(language){
		return !!(this.locales && angular.isDefined( this.locales[language.id] ));
	};

	JBFormLocaleComponentController.prototype.translationIsEmpty = function(data){
		return this.fields.reduce(function(previous, field){
			return previous && !data[field] && data[field].trim() !== '';
		}, true);
	};

	JBFormLocaleComponentController.prototype.selectSpec = function(data){
		var relations = (data && data.relations) ? data.relations : [];
		if(!relations.length) return;
		for(var i = 0; i<relations.length; i++){
			var current = relations[i]
			if(current.type !== 'hasManyAndBelongsToMany') continue;
			if(this.entityName === current.remote.resource) return current;
			if(this.relationName === current.name) return current;
		}
	};
	/**
	 * Takes the options data passed by the containing component, and sets up the corresponding fieldDefinitions which
	 * are necessary to validate the contained fields.
	 *
	 * @note: In the select call we need to set the related table name and select all fields plus the languages. Currently
	 * we are not able to properly identify locales.
	 *
	 * In some situations, it seems like the update of the field defintions is not propagated properly to the view.
	 * Therefore it is necessary to toggle the languages again!
	 * @todo: trigger error state
	 */
	JBFormLocaleComponentController.prototype.handleOptionsData = function(data){

		// Get remote table's name from the options call
		if (!this.remoteName) {
			var spec = this.selectSpec(data);
			console.error(spec, spec.via.resource);
			this.remoteName = spec.via.resource;
		}

		if(!this.remoteName) return console.error('Could not get remote table\'s name in locale component.');

		return this.loadFields()
					.then(function(fields){
							this.fieldDefinitions = this.filterFields(fields);
							var fieldNames = Object.keys(this.fieldDefinitions);
							this.fields = this.sortFields(fieldNames);
							return this.ensureLanguageIsSelected();
						}.bind(this)
					, function(error){
						console.error(error);
					});
	};

	/**
	 * @todo: find a proper way to resolve the endpoint!!
	 * @returns {*}
	 */
	JBFormLocaleComponentController.prototype.loadFields = function(){
		var url = '/' + (this.remoteService ? this.remoteService + '.' : '') + this.getLocaleProperty();
		// The options call is now cached in the api
		//if(this.fieldDefinitions) return this.$q.when(this.fieldDefinitions);
		return this.api.getOptions(url).then(function(fields){
			return fields.properties;
		}.bind(this), function(error){
			console.error(error);
		});
	};

	JBFormLocaleComponentController.prototype.sortFields = function(fields){

		// Check if order is available; if not, don't sort
		if (!this.fieldOrder || !this.fieldOrder.length) return fields;

		var sortedFields = []
			, unsortedIndex = this.fieldOrder.length;

		fields.forEach(function(field) {
			var index = this.fieldOrder.indexOf(field) > -1 ? this.fieldOrder.indexOf(field) : unsortedIndex++;
			sortedFields[index] = field;
		}.bind(this));
	
		return sortedFields;

	};

	JBFormLocaleComponentController.prototype.filterFields = function(fields){
		if(!fields) return {};
		return fields.reduce(function(sanitizedFields, field){
			if((!this.fieldsExclude || this.fieldsExclude.indexOf(field.name) == -1) && field.isPrimary !== true){
				sanitizedFields[field.name] = field;
			}
			return sanitizedFields;
		}.bind(this), {});
	};

	JBFormLocaleComponentController.prototype._localeIsEmpty = function(locale){
		return this.fields.every(function(fieldName){
			return this._localePropertyIsEmpty(locale[fieldName]);
		}, this);
	};

	JBFormLocaleComponentController.prototype._localePropertyIsEmpty = function(value){
		return angular.isUndefined(value) || value.trim() == '';
	};

	JBFormLocaleComponentController.prototype._localeGetChanges = function(locale, originalLocale){
		// the locale is new
		if(!angular.isDefined(originalLocale)){
			// the locale has no data, meaning that there are no changes
			if(this._localeIsEmpty(locale)){
				return [];
			}
			// otherwise all fields are new
			return this.fields;
		}

		// collect all fields which do not hold the same value
		return this.fields.reduce(function(changedFields, fieldName){
			if(locale[fieldName] != originalLocale[fieldName]){
				changedFields.push(fieldName);
			}
			return changedFields;
		}.bind(this), []);
	};

	/**
	 * We could also adjust the _localeGetChanges method to be able to deal with locales that were not created.
	 */
	JBFormLocaleComponentController.prototype.getSaveCalls = function(){

		var   calls     = [];

		if(this.isReadonly) return calls;

		this.locales.forEach(function(locale, id){

			var originalLocale    = this.originalLocales[id];

			// If originalLocale has at least one field, it was pre-existing, use PATCH (instead of POST)
			var localeExisted = false;
			if (originalLocale) {
				localeExisted = Object.keys(originalLocale).some((key) => {
					return this.fields.indexOf(key) > -1;
				});
			}

			// Locale exists (means it was created by the angular binding or was already present)
			if(locale) {
				var   changes = this._localeGetChanges(locale, originalLocale)
					, method  = (localeExisted) ? 'PATCH' : 'POST';
				// There are changes
				if(changes.length > 0) {
					var call = {};
					call.data = changes.reduce(function(entity, field){
							entity[field] = locale[field];
							return entity;
					}, {});

					call.url            = {};
					call.url.path       = 'language/'+id;
					call.url.mainEntity = 'prepend';

					call.method = method;
					calls.push(call);
				}
			}
		}, this);
		return calls;
	};
	/**
	 * Returns the name of the property we need to select the localization table on the base entity.
	 */
	JBFormLocaleComponentController.prototype.getLocaleProperty = function(){
		return this.remoteName;
		//return this.options.via.resource;
	};

	JBFormLocaleComponentController.prototype.handleGetData = function(data){
		var locales             	= (data) ? data[this.getLocaleProperty()] : data;
		if (locales){
			this.originalLocales    = this.normalizeModel(locales);
			this.locales            = angular.copy(this.originalLocales);
			this.model 				= this.locales;
		}
		this.ensureLanguageIsSelected().then(this.adjustAllHeights.bind(this));
	};

	JBFormLocaleComponentController.prototype.ensureLanguageIsSelected = function(){
		if(!this.selectedLanguages) this.selectedLanguages = [];
		if(this.selectedLanguages.length === 0) {
			return this.toggleLanguage(null, this.supportedLanguages[0]);
		}
		return this.$timeout();
	};

	JBFormLocaleComponentController.prototype.getFields = function(){
		if(!this.fieldDefinitions) return [];
		return this.fields.map(function(fieldName){
			return this.fieldDefinitions[fieldName];
		}, this);
	};

	/**
	* Whoooaaaa, that is crazy!
	* this.locales and this.model is an array where every language is placed at the language's id.
	* If we have de with id 3 and fr with id 7, this.locales will look like
	* [null, null, null, {de…}, null, null, null, {fr}]
	*/
	JBFormLocaleComponentController.prototype.normalizeModel = function(data){
		return data.reduce(function(map, item){
			map[item.language.id] = item;
			return map;
		}, []);
	};

	JBFormLocaleComponentController.prototype.getLocales = function(){
		return this.locales;
	};
	/**
	 * @todo: Load all fields and then eliminate primary and foreign keys. In this case we don't need to release the
	 * backoffice if the table is extended with new locales.
	 *
	 * @returns {*}
	 */
	JBFormLocaleComponentController.prototype.getSelectFields = function(){

		var   localeTableName   = this.getLocaleProperty()
			, languageSelector  = [localeTableName, 'language', '*'].join('.')
			, selects           = [];

		/*selects =  this.fields.map(function(field){default
			return [localeTableName, field].join('.');
		}, this);*/
		selects.push([localeTableName, '*'].join('.'));
		selects.push(languageSelector);
		return selects;
	};

	/**
	 * @todo: use the registration system to detect all the input fields and let them validate themselves?
	 */
	JBFormLocaleComponentController.prototype.isValid = function(){
		if(this.isReadonly) return true;
		return this.locales.reduce(function(localeValidity, locale, index){
			if(angular.isUndefined(locale)) return localeValidity;
			if(angular.isUndefined(this.originalLocales[index]) && this._localeIsEmpty(locale)) return localeValidity;
			return localeValidity && this.fields.reduce(function(fieldValidity, fieldName){
					return fieldValidity && this.fieldIsValid(locale, fieldName);
			}.bind(this), true);
		}.bind(this), true);
	};

	_module.controller('JBFormLocaleComponentController', [
		  '$scope'
		, '$q'
		, '$timeout'
		, 'APIWrapperService'
		, 'JBFormComponentsService'
		, 'SessionService'
		, 'BackofficeAPIWrapperService'
		, JBFormLocaleComponentController
	]);
})();