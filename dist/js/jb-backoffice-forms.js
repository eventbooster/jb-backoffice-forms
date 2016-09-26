'use strict';

/**
* Parent controller for all autoInputs. Provides basic functionality like
* - calls afterInit 
* - registers itself at the detailViewController
* - check if child controllers implement updateData()
* - Make element, detailViewController, entityName and entityId available
* - … (needs refactoring!)
*/
var AutoInputController = function( $scope, $attrs) {

	// Make angular stuff available to methods
	this.$attrs				= $attrs;

	// $scope always holds two objects gotten from auto-form-element: 
	// - optionData
	// - originalAttributes
	// Is passed in from auto-form-element through a newly created 
	// and isolated scope.

	this.$scope				= $scope;

	this.$scope.entityName	= undefined;
	this.$scope.entityUrl	= undefined;

	$scope.data		= {
		value		: undefined
		, name		: $attrs[ 'for' ]
		// Required for backofficeLabel directive
		, valid		: true
	};

	// Needs to be defined in controller.slkdjf
	/*this.isValid				= function() {
		return $scope.data.valid;
	};*/

	this.element				= undefined;
	this.detailViewController	= undefined;

};

/**
* Called from directive's link function 
*/
AutoInputController.prototype.init = function( el, detViewController ) {

	this.element				= el;
	this.detailViewController	= detViewController;

	// Make entityId and entityName available to scope
	this.$scope.entityName		= detViewController.getEntityName();
	this.$scope.entityId		= detViewController.getEntityId();

	// Register myself @ detailViewController 
	// -> I'll be notified on save and when data is gotten
	this.detailViewController.register( this );

	// Call afterInit
	// E.g. replace current element with new directive (see relation-input). Can only be done
	// after the element has been initialized and data set
	if( this.afterInit && angular.isFunction( this.afterInit ) ) {
		this.afterInit();
	}

	// Check if updateData method was implemented.
	if( !this.updateData ) {
		console.error( 'AutoInputController: updateData method missing in %o %o', this, el );
	}
	else {
		this.detailViewController.registerGetDataHandler( this.updateData.bind( this ) );
	}

};
( function() {

	'use strict';

	angular

	// jb.backofficeFormElements: Namespace for new form elements (replacement for jb.backofficeAutoFormElement)
	.module( 'jb.backofficeFormComponents', [
			'jb.fileDropComponent',
            'jb.backofficeShared', 'ui.router', 'jb.backofficeAPIWrapper' ] );

} )();

(function () {
    'use strict';

    /**
     * @notes: removed jQuery dependency, made the types injectable, did cleanup
     * @notes:  The directive triggers an additional compilation phase after it has gotten the options data, therefore
     *          the options are available within the sub components controllers. While this is necessary to render
     *          the content correctly, it also creates a fixed dependency between some components and the
     *          auto-form-element. The main problem is the fact that not all components need the same data. Further,
     *          some components require the option data to be able to register their selects.
     *
     * @todo: remove the explicit dependency to the parent controller
     * @todo: emit registration event after linking phase
     * @todo:
     */

    /**
     * Directive for autoFormElements: Replaces itself with the corresponding input element
     * as soon as the detailView directive has gotten the necessary data (type, required etc.)
     * from the server through an options call
     */
    var typeKey = 'jb.backofficeAutoFormElement.types'
        , _module = angular.module('jb.backofficeAutoFormElement', ['jb.backofficeFormEvents']);

    _module.value(typeKey, {
          'text': 'text'
        , 'number': 'text'
        , 'boolean': 'checkbox'
        , 'relation': 'relation'
        , 'language': 'language'
        , 'image': 'image'
        , 'datetime': 'dateTime'
        , 'date': 'dateTime'
    });

    _module.directive('autoFormElement', ['$compile', function ($compile) {

        return {
              controllerAs      : '$ctrl'
            , bindToController  : true
            , link : {
                post: function (scope, element, attrs, ctrl) {
                    ctrl.init(scope, element, attrs);
                }
                , pre: function (scope, element, attrs, ctrl) {
                    ctrl.preLink(scope, element, attrs);
                }
            }
            , controller        : 'AutoFormElementController'
            // If we leave it out and use $scope.$new(), angular misses detailView controller
            // as soon as we use it twice on one site.
            // @todo: add explicit bindings to find out where the data comes from
            , scope             : true
        };
    }]);

    function AutoFormElementController($scope, $attrs, $compile, $rootScope, fieldTypes, subcomponentsService) {
        this.$scope     = $scope;
        this.$attrs     = $attrs;
        this.$compile   = $compile;
        this.$rootScope = $rootScope;
        this.fieldTypes = fieldTypes;

        this.name       = $attrs.for;
        this.label      = this.name;
        this.$attrs.$observe('label', function(value){
            this.label = value;
        }.bind(this));

        this.subcomponentsService   = subcomponentsService;
        this.registry               = null;
    }

    AutoFormElementController.prototype.preLink = function (scope, element, attrs) {
        this.registry = this.subcomponentsService.registryFor(scope);
        this.registry.listen();
    };

    AutoFormElementController.prototype.init = function (scope, element, attrs) {
        this.element = element;
        this.registry.registerYourself();
        this.registry.registerOptionsDataHandler(this.updateElement.bind(this));
    };

    AutoFormElementController.prototype.updateElement = function(fieldSpec){
            var   elementType
                , elementSpec = fieldSpec[this.name];

            if (!elementSpec || !elementSpec.type) {
                console.error('AutoFormElement: fieldSpec %o is missing type for field %o', fieldSpec, this.name);
                return;
            }

            elementType = this.fieldTypes[elementSpec.type];

            if (!elementType) {
                console.error('AutoFormElement: Unknown type %o', fieldSpec.type);
                console.error('AutoFormElement: elementType missing for element %o', this.element);
                return;
            }

            console.log('AutoFormElement: Create new %s from %o', elementType, fieldSpec);

            // camelCase to camel-case
            var dashedCasedElementType = elementType.replace(/[A-Z]/g, function (v) {
                return '-' + v.toLowerCase();
            });

            // @todo: Pass attributes of original directive to replacement, is this necessary?
            // @todo: just create the template string accordingly? Can we find out which attributes are bindings and stuff?
            // @todo: or iterate the attributes create the attributes on the child element?
            this.$scope.originalAttributes = this.$attrs;

            var newElement = angular.element('<div data-auto-' + dashedCasedElementType + '-input data-for="' + this.name + '" label="' + this.label + '"></div>');
            // @todo: not sure if we still need to prepend the new element when we actually just inject the registry
            this.element.replaceWith(newElement);
            this.registry.unregisterOptionsDataHandler(this.updateElement);
            // now the registry should know all the subcomponents
            this.$compile(newElement)(this.$scope);
            // delegate to the options data handlers of the components
            this.registry.optionsDataHandler(fieldSpec);
    };

    _module.controller('AutoFormElementController', [
        '$scope',
        '$attrs',
        '$compile',
        '$rootScope',
        typeKey,
        'backofficeSubcomponentsService',
        AutoFormElementController ]);
})();


(function (undefined) {
    'use strict';

    /**
     * Auto checkbox input.
     *
     */

    var AutoCheckboxInputController = function ($scope, $attrs, componentsService) {

        this.$attrs = $attrs;
        this.$scope = $scope;
        this.name = $attrs['for'];
        this.label = this.name;

        $attrs.$observe('label', function (value) {
            this.label = value;
        }.bind(this));

        this.subcomponentsService = componentsService;
    };

    AutoCheckboxInputController.prototype.constructor = AutoCheckboxInputController;

    AutoCheckboxInputController.prototype.updateData = function (data) {
        this.originalData = this.$scope.data.value = data[this.name];
    };

    AutoCheckboxInputController.prototype.getSelectFields = function(){
        return this.name;
    };

    AutoCheckboxInputController.prototype.getSaveCalls = function () {
        if (this.originalData === this.$scope.data.value) return [];

        var data = {};
        data[this.$scope.data.name] = this.$scope.data.value === true;
        return [{
            data: data
        }];
    };

    AutoCheckboxInputController.prototype.preLink = function (scope, element, attrs) {
        scope.data = {
            value: undefined
            , name: this.name
            , valid: true
        };
    };

    AutoCheckboxInputController.prototype.isValid = function () {
        return true;
    };

    AutoCheckboxInputController.prototype.isRequired = function(){
        return false;
    };

    AutoCheckboxInputController.prototype.registerAt = function (parent) {
        parent.registerGetDataHandler(this.updateData.bind(this));
    };

    AutoCheckboxInputController.prototype.init = function (scope, element, attrs) {
        this.subcomponentsService.registerComponent(scope, this);
    };

    var _module;

    _module = angular.module('jb.backofficeAutoFormElement');
    _module.directive('autoCheckboxInput', [function () {

        return {
            scope: true
            , controller: 'AutoCheckboxInputController'
            , bindToController: true
            , controllerAs: '$ctrl'
            , link: {
                pre: function (scope, element, attrs, ctrl) {
                    ctrl.preLink(scope, element, attrs, ctrl);
                }
                , post: function (scope, element, attrs, ctrl) {
                    ctrl.init(scope, element, attrs);
                }
            }
            , template: '<div class="form-group">' +
            '<label data-backoffice-label data-label-identifier="{{$ctrl.label}}" data-is-valid="$ctrl.isValid()" data-is-required="$ctr.isRequired()"></label>' +
            '<div class="col-md-9">' +
            '<div class="checkbox">' +
            '<input type="checkbox" data-ng-model="data.value"/>' +
            '</div>' +
            '</div>' +
            '</div>'
        };

    }]);

    _module.controller('AutoCheckboxInputController', [
        '$scope',
        '$attrs',
        'backofficeSubcomponentsService',
        AutoCheckboxInputController]);
})();
(function (undefined) {


    'use strict';

    var AutoDateTimeInputController = function ($scope, $attrs, componentsService) {
        this.$attrs = $attrs;
        this.$scope = $scope;
        this.subcomponentsService = componentsService;

        this.originalData = undefined;
        this.date = undefined;

        this.time = false;
        this.required = true;
    };

    AutoDateTimeInputController.prototype.getSelectFields = function(){
        return [this.name];
    };

    AutoDateTimeInputController.prototype.isRequired = function () {
        return this.required === true;
    };

    AutoDateTimeInputController.prototype.isValid = function () {
        if (this.isRequired()) return !!this.date;
        return true;
    };

    AutoDateTimeInputController.prototype.updateData = function (data) {
        var value = data[this.name];
        this.date = (value) ? new Date(value) : undefined;
        this.originalData = this.date;
    };

    function pad(nr) {
        return nr < 10 ? '0' + nr : nr;
    }

    AutoDateTimeInputController.prototype.getSaveCalls = function () {

        var   currentDate   = this.date
            , originalDate  = this.originalData
            , call          = { data: {}}
            , dateString = '';
        // No date set
        if (!currentDate && !originalDate) return [];
        // Dates are the same
        if (currentDate && originalDate && currentDate.getTime() == originalDate.getTime()) return [];
        // a new date was set
        if (currentDate) {
            dateString = currentDate.getFullYear()
                + '-' + pad(currentDate.getMonth() + 1)
                + '-' + pad(currentDate.getDate())
                + ' ' + pad(currentDate.getHours())
                + ':' + pad(currentDate.getMinutes())
                + ':' + pad(currentDate.getSeconds());
        } // else, date was deleted
        call.data[this.name] = dateString;
        return [call];

    };

    AutoDateTimeInputController.prototype.init = function (scope) {
        this.subcomponentsService.registerComponent(scope, this);
    };

    AutoDateTimeInputController.prototype.registerAt = function (parent) {
        parent.registerOptionsDataHandler(this.handleOptionsData.bind(this));
        parent.registerGetDataHandler(this.updateData.bind(this));
    };

    AutoDateTimeInputController.prototype.handleOptionsData = function (data) {
        var spec = data[this.name];
        if (!spec) return console.error('AutoDateTimeInput: No field spec for %o', this.name);

        this.required = spec.required === true;
        this.time = spec.time === true;
    };
    AutoDateTimeInputController.prototype.showTime = function () {
        return this.time;
    };


    var _module = angular.module('jb.dateTime', []);
    _module.directive('autoDateTimeInput', [function () {

        return {
              scope : {
                    label : '@'
                  , name  : '@for'
              }
            , controller        : 'AutoDateTimeInputController'
            , bindToController  : true
            , controllerAs      : '$ctrl'
            , link: function (scope, element, attrs, ctrl) {
                ctrl.init(scope, element, attrs);
            }
            , template: '<div class="form-group form-group-sm">' +
            '<label data-backoffice-label data-label-identifier="{{$ctrl.label}}" data-is-required="$ctrl.isRequired()" data-is-valid="$ctrl.isValid()"></label>' +
            '<div data-ng-class="{ \'col-md-9\': !$ctrl.showTime(), \'col-md-5\': $ctrl.showTime() }">' +
            '<input type="date" class="form-control input-sm input-date" data-ng-model="$ctrl.date">' +
            '</div>' +
            '<div class="col-md-4" data-ng-if="$ctrl.showTime()">' +
            '<input type="time" class="form-control input-sm input-time" data-ng-model="$ctrl.date" />' +
            '</div>' +
            '</div>'
        };

    }]);

    _module.controller('AutoDateTimeInputController', [
        '$scope',
        '$attrs',
        'backofficeSubcomponentsService',
        AutoDateTimeInputController]);

})();
(function(undefined) {

    'use strict';

    /**
     * Auto language input. Inherits from AutoInput.
     *
     * @todo: remove the dependency to the detailViewController
     * @todo: remove the dependency to the optionData (Does not work outside the auto-form-element since the optionData
     * is required and usually is not available during compilation and linking!)
     */

    var AutoLanguageInputController = function ($scope, $attrs, componentsService) {

        // Holds current validity state
        // @todo: just use delegation and check validity of every registered component
        var valid = true;

        AutoInputController.call(this, $scope, $attrs);

        //@todo: how does this work, can we be sure this is available?
        console.log('AUTO LANGUAGE INPUT CONTROLLER: ', this.$scope.optionData);
        //@todo: wrap this into the getSelectFields method
        this.select = this.$scope.optionData.tableName + '.*';

        console.log('AutoLanguageInputController: select is %o', this.select);
        this.formEvents             = formEvents;
        this.originalData           = undefined;
        this.registeredComponents   = [];
        this.subcomponentsService   = componentsService;


        // Key: id_language
        // Value			: {
        //	identifier		: 'name'
        // }
        // This structure is needed so that we can access the properties directly in the DOM
        // through ngmodel.
        this.$scope.locales = {};
        /**
         * @todo: pass the fields through the attributes
         * @todo: this is a different requirement than the other auto-input types have, I'd prefer to remove the
         *        language from the auto-input directive
         */
        $scope.fields = $scope.$eval(this.$scope.originalAttributes.fields);
        $scope.tableName = this.$scope.optionData.tableName;


        // Make data fit $scope.locales
        this.$scope.$on('dataUpdate', function (ev, data) {
            var locs = data[this.$scope.optionData.tableName];
            this.setData(locs);
        }.bind(this));


        // Used detailView. data-backoffice-label:
        // see $scope.isValid
        // @todo: delegate to the hosted components
        this.isValid = function () {
            return valid;
        };

        // Expose for back-office-label
        $scope.isValid = this.isValid;

        // Called from locale-component if validity changes.
        // @todo: use delegation
        $scope.setValidity = function (validity) {
            valid = validity;
        };


    };

    AutoLanguageInputController.prototype = Object.create(AutoInputController.prototype);
    AutoLanguageInputController.prototype.constructor = AutoLanguageInputController;
    AutoLanguageInputController.isValid = function(){

    };

    AutoLanguageInputController.prototype.registerAt = function(parent){
        parent.registerGetDataHandler(this.updateData.bind(this));
        //@todo: registerOptionDataHandler which extracts the tableName
    };

    AutoLanguageInputController.prototype.getSaveCalls = function () {

        // Make one call per changed language
        // url: /entity/id/language/id
        // Method: POST or PATCH (can't use PUT as it tries to re-establish an already
        // made connection on a unique relation)
        // DELETE is not needed (done through data)
        // data: identifier -> translation

        var ret = [];

        // Go through languages
        for (var i in this.$scope.locales) {

            var trans = this.$scope.locales[i]
                , langId = i;

            var url = 'language/' + langId;

            // Language didn't exist in originalData
            if (!this.originalData || !this.originalData[langId]) {

                ret.push({
                    method: 'POST'
                    , url: url
                    , data: this.$scope.locales[langId]
                });

            }

            // Get changed fields
            else {

                // Store changed fields
                var changed = {}
                    , hasChanged = false;


                // Go through fields (only the visible fields may have been changed)
                for (var n = 0; n < this.$scope.fields.length; n++) {

                    var fieldName = this.$scope.fields[n];

                    // Current field is not the same as it was at the beginning: Add to changed
                    if (this.$scope.locales[i][fieldName] !== this.originalData[i][fieldName]) {
                        changed[fieldName] = this.$scope.locales[i][fieldName];
                        hasChanged = true;
                    }

                }

                // There were changes to that language
                if (hasChanged) {
                    var method = this.originalData[langId] ? 'PATCH' : 'POST';
                    ret.push({
                        method: method
                        , data: changed
                        , url: url
                    });

                }

            }

        }

        return ret;

    };

    AutoLanguageInputController.prototype.updateData = function (data) {

        console.log('AutoLanguageInput: updateData got %o for tableName %o', data, data[this.$scope.optionData.tableName]);

        // No data available
        if (!data) {
            return;
        }
        // @todo: access the related table i.e. eventLocale
        var localeData = data[this.$scope.optionData.tableName];

        if (!(localeData && angular.isArray(localeData))) {
            console.error('AutoLanguageInput: data missing for locale. Key is %o, data is %o', this.$scope.optionData.tableName, data);
            return;
        }

        /**
         * Loop over the properties of the locale data.
         * All fields starting with 'id_' are relations to other entities.
         *
         * @todo: use the option data distinguish foreign keys instead of relying on the convention
         */
        localeData.forEach(function (locale) {

            var languageId = locale.id_language;
            if (!this.$scope.locales[languageId]) {
                this.$scope.locales[languageId] = {};
            }

            for (var property in locale) {
                if (property.substring(0, 3) === 'id_') continue;
                this.$scope.locales[languageId][property] = locale[property];
            }

        }, this);

        // Copy to originalData
        this.originalData = angular.copy(this.$scope.locales);
    };

    AutoLanguageInputController.prototype.init = function (el, detViewController) {
        this.element = el;
        this.detailViewController = detViewController;

        // Make entityId and entityName available to scope
        this.$scope.entityName = detViewController.getEntityName();
        this.$scope.entityId = detViewController.getEntityId();

        // Register myself @ detailViewController
        // -> I'll be notified on save and when data is gotten
        // this.detailViewController.register( this );

        // Call afterInit
        // E.g. replace current element with new directive (see relation-input). Can only be done
        // after the element has been initialized and data set
        if (this.afterInit && angular.isFunction(this.afterInit)) {
            this.afterInit();
        }

        // Check if updateData method was implemented.
        if (!this.updateData) {
            console.error('AutoInputController: updateData method missing in %o %o', this, el);
        }
        else {
            this.detailViewController.registerGetDataHandler(this.updateData.bind(this));
        }
    };

    AutoLanguageInputController.prototype.afterInit = function () {
        console.log('SCOPE OF LANGUAGE:', this.$scope);
        this.$scope.$emit(this.formEvents.registerComponent, this);
    };


    var _module;
    _module = angular.module('jb.backofficeAutoFormElement');
    _module.directive('autoLanguageInput', [function () {

            return {
                  scope: true
                , require: ['autoLanguageInput', '^detailView']
                , controller: 'AutoLanguageInputController'
                , link: function (scope, element, attrs, ctrl) {
                    ctrl[0].init(element, ctrl[1]);
                }
                /**
                 * Component itself is never required and always valid. Only single fields may be required or invalid.
                 * 1. tableName is set in this constructor coming from options call
                 * 2. locales is set in the controller, also based on the options data (added to the selects within the controllers constructor)
                 */
                , template:
                    '<div class="row">' +
                        '<div data-locale-component class="col-md-12" data-fields="fields" data-table-name="tableName" data-model="locales" data-set-validity="setValidity(validity)" data-entity-name="entityName"></div>' +
                    '</div>'
            };

        }]);

    _module.controller('AutoLanguageInputController', [
          '$scope'
        , '$attrs'
        , 'backofficeSubcomponentsService'
        , AutoLanguageInputController]);
})();








(function(undefined) {
    'use strict';

    /**
     *
     */
    var AutoTextInputController = function ($scope, $attrs, componentsService) {

        this.$scope = $scope;
        this.$attrs = $attrs;
        this.name = $attrs['for'];
        this.label =  this.name;
        this.select = this.name;
        this.componentsService = componentsService;
        this.originalData = undefined;
        this.required = true;

        $attrs.$observe('label', function(label){
            this.label = label;
        }.bind(this))
    };

    AutoTextInputController.prototype.isRequired = function(){
        return this.required === true;
    };

    AutoTextInputController.prototype.isValid = function () {
        if(this.isRequired()) return !!this.$scope.data.value;
        return true;
    };

    AutoTextInputController.prototype.registerAt = function(parent){
        parent.registerGetDataHandler(this.updateData.bind(this));
        parent.registerOptionsDataHandler(this.handleOptionsData.bind(this));
    };

    AutoTextInputController.prototype.handleOptionsData = function(data){
        var spec = data[this.name];
        if(!angular.isDefined(spec)) return console.error('No options data available for text-field %o', this.name);
        this.required = spec.required === true;
    };

    AutoTextInputController.prototype.init = function (scope) {
        this.componentsService.registerComponent(scope, this);
    };

    AutoTextInputController.prototype.preLink = function (scope) {
        scope.data = {
              name: this.name
            , value: undefined
            , valid: false
        };
    };

    AutoTextInputController.prototype.updateData = function (data) {
        this.originalData = this.$scope.data.value = data[this.name];
    };

    AutoTextInputController.prototype.getSaveCalls = function () {

        if (this.originalData === this.$scope.data.value) return [];

        var data = {};
        data[this.name] = this.$scope.data.value;

        return [{
            data: data
        }];
    };

    var _module = angular.module('jb.backofficeAutoFormElement');
        _module.controller('AutoTextInputController', [
            '$scope' ,
            '$attrs' ,
            'backofficeSubcomponentsService' ,
            AutoTextInputController]);

    /**
     * Directive for an autoFormElement of type 'text'
     */
        _module.directive('autoTextInput', [function () {

            return {
                  scope : true
                , controllerAs: '$ctrl'
                , link: {
                    post: function (scope, element, attrs, ctrl) {
                        ctrl.init(scope, element, attrs);
                    }
                    , pre: function(scope, element, attrs, ctrl){
                        ctrl.preLink(scope, element, attrs);
                    }
                }
                , controller: 'AutoTextInputController'
                , template: '<div class=\'form-group form-group-sm\'>' +
                                '<label data-backoffice-label data-label-identifier="{{$ctrl.label}}" data-is-valid="$ctrl.isValid()" data-is-required="$ctrl.isRequired()"></label>' +
                                '<div class="col-md-9">' +
                                    '<input type="text" data-ng-attr-id="data.name" class="form-control input-sm" data-ng-attrs-required="$ctrl.isRequired()" data-ng-model="data.value"/>' +
                                '</div>' +
                            '</div>'
            };

        }]);
})();
/***
* Component for data (JSON) property
*/
( function() {

	'use strict';

	angular

	.module( 'jb.backofficeFormComponents' )

	.directive( 'backofficeDataComponent', [ function() {

		return {
			require				: [ 'backofficeDataComponent', '^detailView' ]
			, controller		: 'BackofficeDataComponentController'
			, controllerAs		: 'backofficeDataComponent'
			, bindToController	: true
			, templateUrl		: 'backofficeDataComponentTemplate.html'
			, link				: function( scope, element, attrs, ctrl ) {
				ctrl[ 0 ].init( element, ctrl[ 1 ] );
			}
			, scope: {
				'propertyName'		: '@for'
				, 'fields'			: '='
			}

		};

	} ] )

	.controller( 'BackofficeDataComponentController', [ '$scope', '$rootScope', '$q', 'APIWrapperService', function( $scope, $rootScope, $q, APIWrapperService ) {

		var self = this
			, _element
			, _detailViewController

			, _originalData = {}; // If no data is available at all, use {}

		self.init = function( el, detailViewCtrl ) {

			_element = el;
			_detailViewController = detailViewCtrl;

			_detailViewController.registerOptionsDataHandler( self.updateOptionsData );
			_detailViewController.registerGetDataHandler( self.updateData );

		};



		/**
		* Check if fields variable passed is valid. Returns true if no error was detected, else throws an error.
		*/
		self.checkFields = function() {

			if( !angular.isArray( self.fields ) ) {
				throw new Error( 'BackofficeDataComponentController: fields passed is not an array: ' + JSON.stringify( self.fields ) );
			}


			self.fields.forEach( function( field ) {

				if( !angular.isObject( field ) ) {
					throw new Error( 'BackofficeDataComponentController: field passed is not an object: ' + JSON.stringify( field ) );
				}

				if( !field.name ) {
					throw new Error( 'BackofficeDataComponentController: field is missing name property: ' + JSON.stringify( field ) );
				}

			} );

			return true;

		};




		/**
		* Called with GET data
		*/
		self.updateData = function( data ) {

			if( !self.checkFields() ) {
				return;
			}

			if( data[ self.propertyName ] ) {

				// Use {} as default to prevent errors if reading properties from undefined
				try {

					// When data is set
					if( angular.isString( data[ self.propertyName ] ) ) {
						_originalData = JSON.parse( data[ self.propertyName ] );
					}
					// When data is empty, [object Object] is returned as string
					else if( angular.isObject( data[ self.propertyName ] ) ) {
						_originalData = angular.copy( data[ self.propertyName ] );
					}
					else if( !data[ self.propertyName ] ) {
						_originalData = {};
					}

				} catch( err ) {
					console.error( 'BackofficeDataComponentController: Could not parse data ' + data[ self.propertyName ] );					
				}

			}


			// Set selected
			self.fields.forEach( function( field ) {

				// Add option to remove data
				if( field.values.indexOf( undefined ) === -1 ) {
					field.values.push( undefined );
				}

				// Set selected on field
				if( _originalData[ field.name ] ) {
					field.selected = _originalData[ field.name ];
				}

			} );

		};




		/**
		* Called with OPTIONS data 
		*/
		self.updateOptionsData = function( data ) {

			if( !data[ self.propertyName ] ) {
				console.error( 'BackofficeDataComponentController: Missing OPTIONS data for %o in %o', self.propertyName, data );
				return;
			}

			_detailViewController.register( self );

		};



		/**
		* Returns the fields that need to be selected on the GET call
		*/
		self.getSelectFields = function() {

			return [ self.propertyName ];

		};




		/**
		* Store/Delete files that changed.
		*/
		self.getSaveCalls = function() {


			// No changes
			var changed = false;
			self.fields.forEach( function( field ) {
				if( _originalData[ field.name ] !== field.selected ) {
					changed = true;
				}
			} );

			if( !changed ) {
				console.log( 'BackofficeDataComponentController: No changes made.' );
				return false;
			}

			var ret = _originalData ? angular.copy( _originalData ) : {};

			// Take ret and make necessary modifications.
			self.fields.forEach( function( field ) {

				// Value deleted
				if( field.selected === undefined && ret[ field.name ] ) {
					delete ret[ field.name ];
				}

				// Update value
				else {

					// Don't store empty fields (if newly created; if they existed before, 
					// they were deleted 5 lines above)
					if( field.selected !== undefined ) {
						ret[ field.name ] = field.selected;
					}

				}

			} );

			console.log( 'BackofficeDataComponentController: Store changes %o', ret );

			return {
				data	: {
					// Write on the data field
					data: JSON.stringify( ret )
				}
			};

		};


	} ] )



	.run( [ '$templateCache', function( $templateCache ) {

		$templateCache.put( 'backofficeDataComponentTemplate.html',
			'<div class=\'form-group form-group-sm\' data-ng-repeat="field in backofficeDataComponent.fields">' +
				//'{{ field | json }}' +
				'<label data-backoffice-label data-label-identifier=\'{{field.name}}\' data-is-required=\'false\' data-is-valid=\'true\'></label>' +
				'<div class=\'col-md-8\'>' +
					'<select class=\'form-control\' data-ng-options=\'value for value in field.values\' data-ng-model=\'field.selected\'></select>' +
				'</div>' +
				'<div class=\'col-md-1\'>' + 

				'</div>' +
			'</div>'
		);

	} ] );


} )();


/***
* Date/time/date time component for distributed back offices.
*/
( function() {

	'use strict';

	angular

	.module( 'jb.backofficeFormComponents' )

	.directive( 'backofficeDateComponent', [ function() {

		return {
			require				: [ 'backofficeDateComponent', '^detailView' ]
			, controller		: 'BackofficeDateComponentController'
			, controllerAs		: 'backofficeDateComponent'
			, bindToController	: true
			, templateUrl		: 'backofficeDateComponentTemplate.html'
			, link				: function( scope, element, attrs, ctrl ) {
				ctrl[ 0 ].init( element, ctrl[ 1 ] );
			}
			, scope: {
				'propertyName'		: '@for'
			}

		};

	} ] )

	.controller( 'BackofficeDateComponentController', [ '$scope', '$rootScope', '$q', 'APIWrapperService', function( $scope, $rootScope, $q, APIWrapperService ) {

		var self = this
			, _element
			, _detailViewController

			, _originalData

			, _required
			, _showTime;

		self.date = undefined;

		self.init = function( el, detailViewCtrl ) {

			_element = el;
			_detailViewController = detailViewCtrl;

			_detailViewController.registerOptionsDataHandler( self.updateOptionsData );
			_detailViewController.registerGetDataHandler( self.updateData );

		};

		/**
		* Called with GET data
		*/
		self.updateData = function( data ) {
			
			if( data[ self.propertyName ] ) {

				_originalData 	= new Date( data[ self.propertyName ] );
				self.date 		= new Date( data[ self.propertyName ] );

			}

		};




		/**
		* Called with OPTIONS data 
		*/
		self.updateOptionsData = function( data ) {

			if( !data[ self.propertyName ] ) {
				console.error( 'BackofficeDateComponentController: Missing OPTIONS data for %o', self.propertyName );
				return;
			}

			if(  data[ self.propertyName ].required ) {
				_required = true;
			}

			if(  data[ self.propertyName ].time ) {
				_showTime = true;
			}

			_detailViewController.register( self );

		};



		/**
		* Returns the fields that need to be selected on the GET call
		*/
		self.getSelectFields = function() {

			return [ self.propertyName ];

		};




		/**
		* Store/Delete files that changed.
		*/
		self.getSaveCalls = function() {

			function pad( nr ) {
				return nr < 10 ? '0' + nr : nr;
			}


			if( !_originalData && self.date ||
				_originalData && !self.date ||
				_originalData.getTime() !== self.date.getTime()
			) {

				var data = {};
				data[ self.propertyName ] = self.date.getFullYear() + '-' + pad( self.date.getMonth() + 1 ) + '-' + pad( self.date.getDate() ) + ' ' + pad( self.date.getHours() ) + ':' + pad( self.date.getMinutes() ) + ':' + pad( self.date.getSeconds() );

				return {
					method			: _detailViewController.getEntityId() ? 'PATCH' : 'POST'
					, data			: data
				};

			}

			return false;

		};



		self.isValid = function() {
			return !_required || ( _required && self.date );
		};


		self.isRequired = function() {
			return _required;
		};

		self.showTime = function() {
			return _showTime;
		};



	} ] )



	.run( [ '$templateCache', function( $templateCache ) {

		$templateCache.put( 'backofficeDateComponentTemplate.html',
			'<div class=\'form-group form-group-sm\'>' +
				'<label data-backoffice-label data-label-identifier=\'{{backofficeDateComponent.propertyName}}\' data-is-required=\'backofficeDateComponent.isRequired()\' data-is-valid=\'backofficeDateComponent.isValid()\'></label>' +
				// input[time] and input[date] are bound to the same model. Should work nicely.
				'<div data-ng-class=\'{ "col-md-9": !backofficeDateComponent.showTime(), "col-md-5": backofficeDateComponent.showTime()}\'>' +
					'<input type=\'date\' class=\'form-control input-sm\' data-ng-model=\'backofficeDateComponent.date\'>' +
				'</div>' +
				'<div class=\'col-md-4\' data-ng-if=\'backofficeDateComponent.showTime()\'>' +
					'<input type=\'time\' class=\'form-control input-sm\' data-ng-model=\'backofficeDateComponent.date\' />' +
				'</div>' +
			'</div>'
		);

	} ] );


} )();


/**
* Adds distributed calls to image upload/list component
*/
( function() {

	'use strict';

	angular

	.module( 'jb.backofficeFormComponents' )

	/**
	* <input data-backoffice-image-component 
	*	data-for="enity">
	*/
	.directive( 'backofficeImageComponent', [ function() {

		return {
			  controller		: 'BackofficeImageComponentController'
			, controllerAs		: 'backofficeImageComponent'
			, bindToController	: true
			, link				: function( scope, element, attrs, ctrl ) {
				ctrl.init( scope, element, attrs);
			}
			, scope: {
				  'propertyName'	: '@for'
				, 'pathField'		: '@' // Field that has to be selected to get the image's path, e.g. path or bucket.url
				, 'imageModel'		: '=model'
				, 'label'			: '@'
			}
            , template		    : '<div class="row">' +
            '<label data-backoffice-label data-label-identifier="{{backofficeImageComponent.label}}" data-is-required="false" data-is-valid="true"></label>' +
            '<div class="col-md-9 backoffice-image-component" >' +
            '<div data-file-drop-component data-supported-file-types="[\'image/jpeg\']" data-model="backofficeImageComponent.images" data-error-handler="backofficeImageComponent.handleDropError(error)">' +
            '<ol class="clearfix">' +
            '<li data-ng-repeat="image in backofficeImageComponent.images">' +
            '<a href="#" data-ng-click="backofficeImageComponent.openDetailView( $event, image )">' +
                // #Todo: Use smaller file
            '<img data-ng-attr-src="{{image.url || image.fileData}}"/>' +
            '<button class="remove" data-ng-click="backofficeImageComponent.removeImage($event,image)">&times</button>' +
            '</a>' +
            '<span class="image-size-info" data-ng-if="!!image.width && !!image.height">{{image.width}}&times;{{image.height}} Pixels</span>' +
            '<span class="image-file-size-info" data-ng-if="!!image.fileSize">{{image.fileSize/1000/1000 | number: 1 }} MB</span>' +
            '<span class="focal-point-info" data-ng-if="!!image.focalPoint">Focal Point</span>' +
            '</li>' +
            '<li><button class="add-file-button" data-ng-click="backofficeImageComponent.uploadFile()">+</button></li>' +
            '</ol>' +
            '<input type="file" multiple/>' +
            '</div>' +
            '</div>' +
            '</div>'
		};

	} ] )

	.controller( 'BackofficeImageComponentController', [
			  '$scope'
			, '$rootScope'
			, '$q'
			, '$state'
			, 'APIWrapperService'
			, 'backofficeSubcomponentsService'
			, function( $scope, $rootScope, $q, $state, APIWrapperService, componentsService) {

		var self = this
			, _element
			, _detailViewController

			, _relationKey
			, _singleRelation

			, _originalData;

		self.images = [];

		self.init = function( scope, element, attrs) {

			_element = element;

			self.ensureSingleImageRelation();

            componentsService.registerComponent(scope, self);

		};

        self.registerAt = function(parent){
            parent.registerOptionsDataHandler( self.updateOptionsData );
            parent.registerGetDataHandler( self.updateData );
        };



		/**
		* Make sure only one image can be dropped on a _singleRelation relation
		*/
		self.ensureSingleImageRelation = function() {

			$scope.$watchCollection( function() {
				return self.images;
			}, function(  ) {

				if( _singleRelation && self.images.length > 1 ) {
					// Take last image in array (push is used to add an image)
					self.images.splice( 0, self.images.length - 1 );
				}

			} );

		};



		/**
		* Called with GET data from detailView
		*/
		self.updateData = function( data ) {
			
			// Re-set to empty array. Needed if we store something and data is newly loaded: Will just 
			// append and amount of images will grow if we don't reset it to [].
			self.images = [];

			// No image set: use empty array
			// Don't use !angular.isArray( data.image ); it will create [ undefined ] if there's no data.image.
			if( !data.image ) {
				data.image = [];
			}


			// Image has a hasOne-relation: Is delivered as an object (instead of an array):
			// Convert to array
			if( !angular.isArray( data.image ) ) {
				data.image = [ data.image ];
			}



			// Store original data (to only send differences to the server when saving)
			_originalData = data.image.slice();



			// Create self.images from data.image. 
			data.image.forEach( function( image ) {

				self.images.push( _reformatImageObject( image ) );

			} );

		};


		/**
		* Takes data gotten from /image on the server and reformats it for
		* use in the frontend.
		*/
		function _reformatImageObject( originalObject ) {

			var focalPoint;
			try {
				focalPoint = JSON.parse( originalObject.focalPoint );
			}
			catch(e){
				// Doesn't _really_ matter.
				console.error( 'BackofficeImageComponentController: Could not parse focalPoint JSON', originalObject.focalPoint );
			}


			return {
				// URL of the image itself
				url				: originalObject[ self.pathField ]
				// URL of the entity; needed to crop image
				, entityUrl		: '/image/' + originalObject.id
				, focalPoint	: focalPoint
				, width			: originalObject.width
				, height		: originalObject.height
				, fileSize		: originalObject.size
				, mimeType		: originalObject.mimeType.mimeType
				, id			: originalObject.id // Needed to save the file (see self.getSaveCalls)
			};

		}



		/**
		* Called with OPTIONS data 
		*/
		self.updateOptionsData = function( data ) {

			if( !data[ self.propertyName ] || !angular.isObject( data[ self.propertyName ] ) ) {
				console.error( 'BackofficeImageComponentController: Missing data for %o', self.propertyName );
				return;
			}

			// Relation is 1:n and stored on the entity's id_image field (or similar): 
			// Store relation key (e.g. id_image).
			if( data[ self.propertyName ].relationKey ) {
				_relationKey = data[ self.propertyName ].relationKey;
				_singleRelation = true;
			}
			else {
				_singleRelation = false;
			}

			//_detailViewController.register( self );

		};


		/**
		* Returns the fields that need to be selected on the GET call
		*/
		self.getSelectFields = function() {

			return [ self.propertyName + '.*', self.propertyName + '.' + self.pathField, self.propertyName + '.mimeType.*' ];

		};




		/**
		* Store/Delete files that changed.
		*/
		self.getSaveCalls = function() {

			// Store a signle relation (pretty easy)
			if( _singleRelation ) {

				return _saveSingleRelation();

			}

			else {

				return _saveMultiRelation();

			}


		};



		function _saveSingleRelation() {


			// Removed
			if( _originalData && _originalData.length && ( !self.images || !self.images.length ) ) {

				var data = {};
				data[ _relationKey ] = null;

				return {
					// We can savely use PATCH as _originalData existed and
					// therefore entity is present.
					method				: 'PATCH'
					, data				: data
				};

			}

			// Added
			else if ( !_originalData && self.images && self.images.length ) {

				var addData = {};
				addData[ _relationKey ] = self.images[ 0 ].id;

				return {
					method				: _detailViewController.getEntityId() ? 'PATCH' : 'POST'
					, data				: addData
				};

			}

			// Change: Take the last image. This functionality might (SHOULD!) be improved. 
			else if( _originalData && _originalData.length && self.images && self.images.length && _originalData[ 0 ].id !== self.images[ self.images.length - 1 ].id ) {

				var changeData = {};
				changeData[ _relationKey ] = self.images[ self.images.length - 1 ].id;

				return {
					// Patch can be savely used as _originalData exists
					method				: 'PATCH'
					, data				: changeData
				};

			}

			else {
				console.log( 'BackofficeImageComponentController: No changes made to a single relation image' );
				return false;
			}

		}




		function _saveMultiRelation() {

			// Calls to be returned
			var calls			= []

				// IDs of images present on init
				, originalIds	= []

				// IDs of images present on save
				, imageIds		= [];


			if( _originalData && angular.isArray( _originalData ) ) {
				_originalData.forEach( function( img ) {
					originalIds.push( img.id );
				} );
			}


			self.images.forEach( function( img ) {
				imageIds.push( img.id );
			} );


			// Deleted
			originalIds.forEach( function( id ) {
				if( imageIds.indexOf( id ) === -1 ) {

					// Original image seems to be automatically deleted when the relation is removed.
					// Remove image iself (try to; not the relation)
					calls.push( {
						method		: 'DELETE'
						, url		: '/image/' + id
					} );

				}
			} );

			// Added
			imageIds.forEach( function( id ) {
				if( originalIds.indexOf( id ) === -1 ) {
					calls.push( {
						method		: 'POST'
						, url		: 'image/' + id
					} );
				}
			} );

			console.log( 'BackofficeImageComponentController: Calls to be made are %o', calls );
			return calls;


		}




		/**
		* Upload all image files
		*/
		self.beforeSaveTasks = function() {

			var requests = [];

			// Upload all added files (if there are any), then resolve promise
			self.images.forEach( function( image ) {

				// Only files added per drag and drop have a file property that's an instance of File
				// (see file-drop-component)
				if( image.file && image.file instanceof File ) {

					console.log( 'BackofficeImageComponentController: New file %o', image );
					// Errors will be handled in detail-view
					requests.push( _uploadFile( image ) );

				}

			} );

			console.log( 'BackofficeImageComponentController: Upload %o', requests );

			return $q.all( requests );

		};




		/**
		* Uploads a single file. 
		* @param {Object} file		Object returned by drop-component. Needs to contain a file property containing a File type.
		*/
		function _uploadFile( image ) {

			console.log( 'BackofficeImageComponentController: Upload file %o to /image through a POST request', image );

			return APIWrapperService.request( {
				method				: 'POST'
				, data				: {
					image			: image.file
				}
				, url				: '/image'
			} )

			.then( function( data ) {

				// Store data gotten from server on self.images[ i ] ) 
				// instead of the image File object
				var index = self.images.indexOf( image );

				var newFileObject = _reformatImageObject( data );

				self.images.splice( index, 1, newFileObject );

				console.log( 'BackofficeImageComponentController: Image uploaded, replace %o with %o', self.images[ index ], newFileObject );

				return data;

			} );

		}




		/**
		* Click on remove icon on image.
		*/
		self.removeImage = function( ev, image ) {

			ev.preventDefault();
			self.images.splice( self.images.indexOf( image ), 1 );

		};



		/**
		* Click on image
		*/
		self.openDetailView = function( ev, image ) {

			ev.preventDefault();

			// Image wasn't stored yet: There's no detail view.
			if( !image.id ) {
				return;
			}

			$state.go( 'app.detail', { entityName: 'image', entityId: image.id } );

		};




		/**
		* Called from within file-drop-component
		*/
		self.handleDropError = function( err ) {
		
			$scope.$apply( function() {
				$rootScope.$broadcast( 'notification', {
					'type'				: 'error'
					, 'message'			: 'web.backoffice.detail.imageDropError'
					, 'variables'		: {
						'errorMessage'	: err
					}
				} );
			} );

		};




		////////////////

		self.uploadFile = function() {

			_element
				.find( 'input[type=\'file\']' )
				.click();

		};




	} ] );


} )();


/**
* Component for a single image to
* - set focal points
*/
( function(undefined) {

	'use strict';

	var _module = angular.module( 'jb.backofficeFormComponents' );

	/**
	* <input data-backoffice-image-component 
	*	data-for="enity">
	*/
	_module.directive( 'backofficeImageDetailComponent', [ function() {

		return {
			  controller		: 'BackofficeImageDetailComponentController'
			, controllerAs		: 'backofficeImageDetailComponent'
			, bindToController	: true
			, link				: function( scope, element, attrs, ctrl ) {
				ctrl.init(scope, element, attrs);
			}
			, template : '<label data-backoffice-label data-label-identifier="{{backofficeImageDetailComponent.label}}" data-is-required="false" data-is-valid="true"></label>' +
			'<div class="col-md-9 backoffice-image-detail-component">' +
			'<div class="image-container">' +
			'<img data-ng-attr-src="{{backofficeImageDetailComponent.image[ backofficeImageDetailComponent.pathField ]}}" data-ng-click="backofficeImageDetailComponent.setFocalPointClickHandler($event)"/>' +
			'<div class="focal-point-indicator" data-ng-if="backofficeImageDetailComponent.getFocalPoint()" data-ng-attr-style="top:{{backofficeImageDetailComponent.getFocalPointInPercent().y}}%;left:{{backofficeImageDetailComponent.getFocalPointInPercent().x}}%"></div>' +
			'</div>' +
			'<div data-ng-if="!backofficeImageDetailComponent.getFocalPoint()">{{ "web.backoffice.image.focalPointNotSet" | translate }}</div>' +
			'<div data-ng-if="backofficeImageDetailComponent.getFocalPoint()">{{ "web.backoffice.image.focalPoint" | translate }}: {{ backofficeImageDetailComponent.getFocalPoint().x }} / {{backofficeImageDetailComponent.getFocalPoint().y}} </div>' +
			'</div>'
			, scope: {
                  pathField : '@'
                , label     : '@'
			}

		};

	} ] );

	_module.controller( 'BackofficeImageDetailComponentController', [
          '$scope'
        , 'backofficeSubcomponentsService'
        , function( $scope, componentsService) {

		var self = this
			, _element
			, _detailViewController

			//, _imageRenderingIds = []
			, _originalFocalPoint;


		self.image = {};


		self.init = function( scope, element, attrs ) {
            componentsService.registerComponent(scope, self);
		};

        self.registerAt = function(parent){
            parent.registerGetDataHandler( self.updateData );
        };

		self.updateData = function( data ) {

			self.image = data;

			// Convert focalPoint to object, but only if it has a x and y property
			if( data.focalPoint ) {
				try {
					var focalPoint = JSON.parse( data.focalPoint );
					if( focalPoint.x && focalPoint.y ) {

						focalPoint.x = parseInt( focalPoint.x, 10 );
						focalPoint.y = parseInt( focalPoint.y, 10 );

						if( isNaN( focalPoint.x ) || isNaN( focalPoint.y ) ) {
							throw new Error( 'x or y property on focalPoint not an integer (or castable).' );
						}

						self.image.focalPoint = focalPoint;
					}
					else {
						throw new Error( 'Property x or y missing on ' + data.focalPoint );
					}
				}
				catch( e ) {
					console.error( 'BackofficeImageDetailComponentController: Could not parse focalPoint ' + data.focalPoint + ': ' + e.message );
				}
			}
			_originalFocalPoint = angular.copy( data.focalPoint );

		};


		/**
		* Implies that path is /image/imageId
		*/
		self.getSelectFields = function() {

			// imageRendering: Renderings must be deleted when changing the focal point. 
			// See https://github.com/joinbox/eb-backoffice/issues/112
			return '*,mimeType.*,' + self.pathField;

		};

		self.getSaveCalls = function() {
			
			// Not set before and after (but not identical due to angular.copy)
			if( !_originalFocalPoint && !self.image.focalPoint ) {
				return false;
			}

			// Same x and y property
			var sameX		= _originalFocalPoint && self.image.focalPoint && _originalFocalPoint.x && self.image.focalPoint.x && self.image.focalPoint.x === _originalFocalPoint.x
				, sameY		= _originalFocalPoint && self.image.focalPoint && _originalFocalPoint.y && self.image.focalPoint.y && self.image.focalPoint.y === _originalFocalPoint.y;
			
			if( sameX && sameY ) {
				return false;
			}

			var calls = [];

			// PATCH on image automatically deletes imageRenderings. No need to do it manually.
			calls.push( {
				// It's always PATCH, as the image does exist
				  method	    : 'PATCH'
				, url			: ''
				, data			: {
					focalPoint	: JSON.stringify( self.image.focalPoint )
				}
			} );

			return calls;

		};




		/**
		* Click handler
		*/
		self.setFocalPointClickHandler = function( ev ) {
				
			var newFocalPoint = {
				x		: Math.round( ev.offsetX / ev.target.width * self.image.width )
				, y		: Math.round( ev.offsetY / ev.target.height * self.image.height )
			};
			console.log( 'BackofficeImageDetailComponentController: Set focal point to ', JSON.stringify( newFocalPoint ) );

			self.image.focalPoint = newFocalPoint;

		};




		/**
		* Returns focalPoint as object with properties x and y – or false. 
		*/ 
		self.getFocalPoint = function() {
			
			if( !self.image || !self.image.focalPoint ) {
				return false;
			}

			return self.image.focalPoint;

		};



		/**
		* Returns % values of focal point. Needed for indicator.
		*/
		self.getFocalPointInPercent = function() {
			var focalPoint = self.getFocalPoint();

			if( !focalPoint ) {
				return false;
			}

			return {
				x		: Math.round( focalPoint.x / self.image.width * 100 )
				, y		: Math.round( focalPoint.y / self.image.height * 100 )
			};

		};

	} ] );


} )();


(function(undefined){
    "use strict";
    /**
     * @todo: This directive needs some refactoring!
     */
    var _module = angular.module('jb.backofficeFormComponents');

    _module.directive('entityLocale', function(){
        return {
              controller: 'BackofficeEntityLocaleController'
            , controllerAs: '$ctrl'
            , bindToController: true
            , scope: {
                  fields        : '<'
                , entityName    : '@entity'
                , relationName  : '@relation'
            }
            , template: '<div class="locale-component row">' +
                            '<div>' +
                            '<ul class="nav nav-tabs">' +
                                '<li ng-repeat="language in $ctrl.getSupportedLanguages()" ng-class="{active:$ctrl.isSelected(language)}">'+
                                    '<a href="#" ng-click="$ctrl.toggleLanguage($event, language)">'+
                                        '{{language.code|uppercase}}' +
                                        '<span data-ng-if="$ctrl.checkForTranslation(language)" class="fa fa-check"></span>' +
                                    '</a>'+
                                '</li>'+
                            '</ul>'+
                            '</div>' +
                            '<div class="locale-content clearfix">' +
                                '<div class="locale-col" ng-repeat="language in $ctrl.getSelectedLanguages()">' +
                                '<p>{{ language.code | uppercase }}</p>' +
                                // now get the field definition , iterate through the fields and bind them to the inputs
                                    '<ul>' +
                                        '<li ng-repeat="field in $ctrl.getFields()">' +
                                            '<label ng-attr-for="locale-{{language.code}}-{{field.name}}" ng-class="{ \'invalid\' : !$ctrl.fieldIsValid($ctrl.locales[ language.id ], field.name)}">' +
                                                '<span data-translate="web.backoffice.{{$ctrl.entityName}}.{{field.name}}"></span>' +
                                                '<span class="required-indicator" data-ng-show="field.required">*</span>' +
                                            '</label>' +
                                            '<textarea ng-model="$ctrl.locales[ language.id ][ field.name ]" ' +
                                                'ng-attr-id="locale-{{language.code}}-{{field.name}}"' +
                                                'class="form-control" ' +
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
     * @param $scope
     * @param $q
     * @param $timeout
     * @param api
     * @param componentsService
     * @param sessionService
     * @constructor
     */
    function BackofficeEntityLocaleController($scope, $q, $timeout, api, componentsService, sessionService, boAPIWrapper){
        this.$scope             = $scope;
        this.api                = api;
        this.$q                 = $q;
        this.$timeout           = $timeout;
        this.componentsService  = componentsService;
        this.options            = null;
        this.fieldDefinitions   = null;
        this.selectedLanguages  = [];
        this.locales            = [];
        this.originalLocales    = [];
        this.heightElement      = null;
        this.heightElementInitialized = false;
        this.boAPI              = boAPIWrapper;
        this.supportedLanguages = (sessionService.get('supported-languages', 'local') || []).map(function(item, index){
            var lang = angular.copy(item.language);
            lang.selected = false;
            return lang;
        }, this);
        this.element = null;
    }

    BackofficeEntityLocaleController.prototype.preLink = function(){};
    BackofficeEntityLocaleController.prototype.postLink = function(scope, element, attrs){
        this.componentsService.registerComponent(scope, this);
        this.heightElement = angular.element('<div></div>');
        this.heightElement = this.heightElement.attr('id', 'locale-height-container');
        this.heightElement.css('position', 'absolute');
        this.heightElement.css('left', '-9999px');
        this.heightElement.css('top', '-9999px');
        this.element = element;
        this.element.append(this.heightElement);
    };

    BackofficeEntityLocaleController.prototype.registerAt = function(parent){
        parent.registerOptionsDataHandler(this.handleOptionsData.bind(this));
        parent.registerGetDataHandler(this.handleGetData.bind(this));
    };

    BackofficeEntityLocaleController.prototype.getSelectedLanguages = function(){
        var selected = [];
        for(var i=0; i<this.supportedLanguages.length; i++){
            var lang = this.supportedLanguages[i];
            if(lang.selected === true) selected.push(lang);
        }
        return selected;
    };

    BackofficeEntityLocaleController.prototype.getSupportedLanguages = function(){
        return this.supportedLanguages;
    };

    BackofficeEntityLocaleController.prototype.fieldIsValid = function(locale, property){

        var   definition = this.fieldDefinitions[property];
        // fields of locales which do not yet exist are not validated
        if(!locale) return true;
        if(definition.required === true) return !this._localePropertyIsEmpty(locale[property]);
        return true;
    };

    BackofficeEntityLocaleController.prototype.adjustHeight = function(event){
        var   element       = angular.element(event.currentTarget);
        this.adjustElementHeight(element);
    };

    BackofficeEntityLocaleController.prototype.adjustElementHeight = function(element){

        var   scrollHeight  = element[0].scrollHeight
            , clientHeight  = element[0].clientHeight
            , hasOverflow   = scrollHeight > clientHeight
            , targetWidth   = element.width()
            , overflow      = hasOverflow ? 'scroll' : 'auto'
            , textValue     = element.val();

        if(!this.heightElementInitialized) this.initializeHeightElement(element);

        this.heightElement.width(targetWidth);
        this.heightElement.css('overflow-y', overflow);
        // adds the content or a placeholder text (to preserve the basic height)
        textValue = textValue.replace(/(\n\r?)/g, '<br>').replace(/(\<br\>\s*)$/, '<br><br>');
        if(textValue.trim() == '') textValue = 'empty';

        this.heightElement.html(textValue);
        element.height(this.heightElement.height());
    };

    BackofficeEntityLocaleController.prototype.adjustAllHeights = function(){
        this.element.find('textarea').each(function(index, element){
            this.adjustElementHeight(angular.element(element));
        }.bind(this));
    };

    BackofficeEntityLocaleController.prototype.initializeHeightElement = function(element){

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
        this.heightElementInitialized = true;
    };

    BackofficeEntityLocaleController.prototype.toggleLanguage = function(event, language){
        if(event) event.preventDefault();
        var langs = this.getSelectedLanguages();
        if(language.selected && langs.length == 1) return;
        language.selected = language.selected !== true;
        this.$timeout(this.adjustAllHeights.bind(this));
    };

    BackofficeEntityLocaleController.prototype.isSelected = function(language){
        return language.selected === true;
    };

    BackofficeEntityLocaleController.prototype.checkForTranslation = function(language){
        return !!(this.locales && angular.isDefined( this.locales[language.id] ));
    };

    BackofficeEntityLocaleController.prototype.translationIsEmpty = function(data){
        return this.fields.reduce(function(previous, field){
            return previous && !data[field];
        }, true);
    };

    /**
     * Takes the options data passed by the containing component, and sets up the corresponding fieldDefinitions which
     * are necessary to validate the contained fields.
     *
     * @note: In the select call we need to set the related table name and select all fields plus the languages. Currently
     * we are not able to properly identify locales.
     */
    BackofficeEntityLocaleController.prototype.handleOptionsData = function(data){
        var spec;
        if(!data && !angular.isDefined(data[this.relationName])) return console.error('No OPTIONS data found in locale component.');
        spec            = data[this.relationName];
        this.options    = spec;
        this.loadFields().then(function(fields){
            this.$timeout(function(){
                this.fieldDefinitions = fields;
            }.bind(this));
        }.bind(this), function(error){
            console.error(error);
        });
    };

    /**
     * @todo: find a proper way to resolve the endpoint!!
     * @returns {*}
     */
    BackofficeEntityLocaleController.prototype.loadFields = function(){
        var url = '/' + this.options.tableName;
        if(this.fieldDefinitions) return this.$q.when(this.fieldDefinitions);
        return this.boAPI.getOptions(url).then(function(fields){
            return this.fields.reduce(function(map, fieldName){
                map[fieldName] = fields[fieldName];
                return map;
            }.bind(this), {});
        }.bind(this), function(error){
            console.error(error);
        });
    };

    BackofficeEntityLocaleController.prototype._localeIsEmpty = function(locale){
        return this.fields.every(function(fieldName){
            return this._localePropertyIsEmpty(locale[fieldName]);
        }, this);
    };

    BackofficeEntityLocaleController.prototype._localePropertyIsEmpty = function(value){
        return angular.isUndefined(value) || value.trim() == '';
    };

    BackofficeEntityLocaleController.prototype._localeGetChanges = function(locale, originalLocale){
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
    BackofficeEntityLocaleController.prototype.getSaveCalls = function(){

        var   calls     = [];

        this.locales.forEach(function(locale, id){

            var   originalLocale    = this.originalLocales[id]
                , localeExisted     = angular.isDefined(originalLocale);

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

    BackofficeEntityLocaleController.prototype.handleGetData = function(data){
        var locales             = data[this.options.tableName];
        this.originalLocales    = this.normalizeModel(locales);
        this.locales            = angular.copy(this.originalLocales);
        if(this.getSelectedLanguages().length === 0) {
            return this.$timeout(function(){ this.toggleLanguage(null, this.supportedLanguages[0]);}.bind(this));
        }
        this.$timeout(this.adjustAllHeights.bind(this));
    };

    BackofficeEntityLocaleController.prototype.getFields = function(){
        if(!this.fieldDefinitions) return [];
        return Object.keys(this.fieldDefinitions).map(function(fieldName){
            return this.fieldDefinitions[fieldName];
        }, this);
    };

    BackofficeEntityLocaleController.prototype.normalizeModel = function(data){
        return data.reduce(function(map, item){
            map[item.language.id] = item;
            return map;
        }, []);
    };

    BackofficeEntityLocaleController.prototype.getLocales = function(){
        return this.locales;
    };
    /**
     * @todo: Load all fields and then eliminate primary and foreign keys. In this case we don't need to release the
     * backoffice if the table is extended with new locales.
     *
     * @returns {*}
     */
    BackofficeEntityLocaleController.prototype.getSelectFields = function(){
        var   localeTableName   = this.options.tableName
            , languageSelector  = [localeTableName, 'language', '*'].join('.')
            , selects;

        selects =  this.fields.map(function(field){
            return [localeTableName, field].join('.');
        }, this);

        selects.push(languageSelector);
        return selects;
    };

    /**
     * @todo: use the registration system to detect all the input fields and let them validate themselves?
     */
    BackofficeEntityLocaleController.prototype.isValid = function(){
        return this.locales.reduce(function(localeValidity, locale, index){
            if(angular.isUndefined(locale)) return localeValidity;
            if(angular.isUndefined(this.originalLocales[index]) && this._localeIsEmpty(locale)) return localeValidity;
            return localeValidity && this.fields.reduce(function(fieldValidity, fieldName){
                    return fieldValidity && this.fieldIsValid(locale, fieldName);
            }.bind(this), true);
        }.bind(this), true);
    };

    _module.controller('BackofficeEntityLocaleController', [
          '$scope'
        , '$q'
        , '$timeout'
        , 'APIWrapperService'
        , 'backofficeSubcomponentsService'
        , 'SessionService'
        , 'BackofficeAPIWrapperService'
        , BackofficeEntityLocaleController
    ]);
})();
/**
* Edit/display markdown
*/
( function() {

	'use strict';

	angular

	.module( 'jb.backofficeFormComponents' )

	/**
	* <input data-backoffice-markdown-component 
	*	data-for="enity">
	*/
	.directive( 'backofficeMarkdownComponent', [ function() {

		return {
			require				: [ 'backofficeMarkdownComponent', '^detailView' ]
			, controller		: 'BackofficeMarkdownComponentController'
			, controllerAs		: 'backofficeMarkdownComponent'
			, bindToController	: true
			, templateUrl		: 'backofficeMarkdownComponentTemplate.html'
			, link				: function( scope, element, attrs, ctrl ) {
				ctrl[ 0 ].init( element, ctrl[ 1 ] );
			}
			, scope: {
				'suggestionTemplate'	: '@'
				, 'searchField'			: '@'
				, 'propertyName'		: '@for'
			}

		};

	} ] )

	.controller( 'BackofficeMarkdownComponentController', [ '$scope', function( $scope ) {

		var self = this
			, _element
			, _detailViewController;

		self.init = function( el, detailViewCtrl ) {
			_element = el;
			_detailViewController = detailViewCtrl;
		};



	} ] )


	.run( [ '$templateCache', function( $templateCache ) {

		$templateCache.put( 'backofficeMarkdownComponentTemplate.html', 

			'<div>' +
				'<div data-language-menu-component data-selected-languages=\'selectedLanguages\' data-is-multi-select=\'false\' data-has-translation=\'hasTranslation(languageId)\'></div>' +
			'</div>'

		);

	} ]);


} )();


/***
* Media group component: Displays videos and images in a list that may be sorted 
* by drag-and-drop.
*/
( function() {

	'use strict';

	angular

	.module( 'jb.backofficeFormComponents' )

	.directive( 'backofficeMediaGroupComponent', [ function() {

		return {
			require				: [ 'backofficeMediaGroupComponent', '^detailView' ]
			, controller		: 'BackofficeMediaGroupComponentController'
			, controllerAs		: 'backofficeMediaGroupComponent'
			, bindToController	: true
			, templateUrl		: 'backofficeMediaGroupComponentTemplate.html'
			, link				: function( scope, element, attrs, ctrl ) {
				ctrl[ 0 ].init( element, ctrl[ 1 ] );
			}
			, scope: {
				'propertyName'		: '@for'
			}

		};

	} ] )

	.controller( 'BackofficeMediaGroupComponentController', [ '$scope', '$rootScope', '$q', 'APIWrapperService', function( $scope, $rootScope, $q, APIWrapperService ) {

		var self = this
			, _element
			, _detailViewController

			, _originalData = []

			, _selectFields = [ '*', 'video.*', 'video.videoType.*', 'image.*', 'mediumGroup_medium.*', 'mediumGroup.*' ];


		self.media = [];


		/**
		* Model that the relation-input («add medium») is bound to. 
		* Watch it to see what new medium is added; after change, remove it's items – should
		* therefore always have a length of 0 or 1. 
		*/
		self.addMediumModel = [];



		self.init = function( el, detailViewCtrl ) {

			_element = el;
			_detailViewController = detailViewCtrl;

			_detailViewController.registerOptionsDataHandler( self.updateOptionsData );
			_detailViewController.registerGetDataHandler( self.updateData );

			self.setupAddMediumModelWatcher();

			self.setupOrderChangeListener();

		};


		/**
		* Sort media by their sortOrder (stored on mediumGroup_medium[0].sortOrder)
		*/
		function sortMedia( a, b ) {

			var aOrder 		= a.mediumGroup_medium[ 0 ].sortOrder
				, bOrder 	= b.mediumGroup_medium[ 0 ].sortOrder;

			return aOrder < bOrder ? -1 : 1;

		}



		/**
		* Called with GET data
		*/
		self.updateData = function( data ) {
			
			if( data[ self.propertyName ] ) {

				var media 		= data[ self.propertyName ] || [];

				try {
					self.media = media.sort( sortMedia );
				} catch( err ) {
					console.error( 'BackofficeMediaGroupComponentController: Properties mediumGroup_medium, it\'s items or sortOrder missing' );
					self.media = media;
				}

				_originalData 	= angular.copy( self.media );

			}

		};




		/**
		* Listen to orderChange events that are fired on the lis through the drag-droplist directive, 
		* update array/model accordingly.
		*/
		self.setupOrderChangeListener = function() {

			// Called whenever drag-drop-list directive causes the order to change. 
			// Re-order the media array.
			_element[ 0 ].addEventListener( 'orderChange', function( ev ) {

				self.media.splice( ev.detail.newOrder, 0, self.media.splice( ev.detail.oldOrder, 1 )[ 0 ] );

			} );

		};




		/**
		* Watch for changes on addMediumModel. When data is added,
		* add it to self.media.
		*/
		self.setupAddMediumModelWatcher = function() {

			$scope.$watch( function() {
				return self.addMediumModel;
			}, function( newVal ) {

				if( self.addMediumModel.length === 1 ) {

					self.addMedium( newVal[ 0 ].id );

					// Re-set model
					self.addMediumModel = [];					
				}

			}, true );

		};


		/**
		* Adds a medium to self.media (is the de-facto click handler for
		* the add medium dropdown).
		*/
		self.addMedium = function( mediumId ) {

			// Check for duplicates
			if( 
				self.media.filter( function( item ) {
					return item.id === mediumId;
				} ).length > 0 
			) {
				console.error( 'BackofficeMediaGroupComponentController: Trying to add duplicate with id', mediumId );
				return;
			}

			APIWrapperService.request( {
				url				: '/' + self.propertyName + '/' + mediumId
				, method		: 'GET'
				, headers		: {
					select		: self.getSelectFields()
				}
			} )
			.then( function( data ) {
				
				self.media.push( data );

			}, function( err ) {

				console.error( 'BackofficeMediaGroupComponentController: Could not get data for medium with id %o: %o', mediumId, err );

				$rootScope.$broadcast( 'notification', {
					'type'		: 'error'
					, 'message'	: 'web.backoffice.detail.loadingError'
					, variables	: {
						errorMessage: err
					}
				} );

			} );


		};



		/**
		* Called with OPTIONS data 
		*/
		self.updateOptionsData = function( data ) {

			_detailViewController.register( self );

		};



		/**
		* Returns the fields that need to be selected on the GET call
		*/
		self.getSelectFields = function() {

			return _selectFields.map( function( item ) {
				return self.propertyName + '.' + item;
			} );

		};




		/**
		* Store/Delete files that changed.
		*/
		self.getSaveCalls = function() {

			console.error( _originalData );

			// Get IDs of entities _before_ anything was edited and curent state.
			var oldIds = _originalData.map( function( item ) {
					return item.id;
				} )
			, newIds = self.media.map( function( item ) {
					return item.id;
				} );



			// Get deleted and created medium relations
			var created = []
				, deleted = [];
			
			newIds.forEach( function( item ) {
				if( oldIds.indexOf( item ) === -1 ) {
					created.push( item );
				}
			} );

			oldIds.forEach( function( item ) {
				if( newIds.indexOf( item ) === -1 ) {
					deleted.push( item );
				}
			} );



			var calls = [];

			// 1. Delete relations
			deleted.forEach( function( item ) {
				calls.push( {
					method		: 'DELETE'
					, url		: self.propertyName + '/' + item
				} );
			} );


			// 2. Create relations
			created.forEach( function( item ) {
				calls.push( {
					method		: 'POST'
					, url		: self.propertyName + '/' + item
				} );
			} );


			return calls;

		};




		/**
		* Returns highest sortOrder on current media. 
		*/
		function getHighestSortOrder() {

			var highestSortOrder = -1;
			self.media.forEach( function( medium ) {

				if( medium.mediumGroup_medium && medium.mediumGroup_medium.length ) {
					highestSortOrder = Math.max( highestSortOrder, medium.mediumGroup_medium[ 0 ].sortOrder );
				}

			} );

			return highestSortOrder;

		}



		/**
		* Store order. All media must first have been saved (getSaveCalls was called earlier)
		*/
		self.afterSaveTasks = function() {


			// No (relevant) changes? Make a quick check.
			// TBD.
			/*if( _originalData.length === self.media.length ) {

				var sameOrder = false;
				_originalData.forEach( function( item, index ) {
					if( item.sortOrder === )
				} );

			}*/


			var highestSortOrder 	= getHighestSortOrder()
				, calls 			= [];

			// Update orders
			self.media.forEach( function( medium ) {

				calls.push( APIWrapperService.request( {
					url				: '/mediumGroup/' + _detailViewController.getEntityId() + '/medium/' + medium.id
					, method		: 'PATCH'
					, data			: {
						sortOrder	: ++highestSortOrder
					}
				} ) );
				
			} );

			return $q.all( calls );

		};




		self.isValid = function() {
			return true;
		};


		self.isRequired = function() {
			return false;
		};


		self.removeMedium = function( medium ) {

			self.media.splice( self.media.indexOf( medium ), 1 );

		};


	} ] )



	.run( [ '$templateCache', function( $templateCache ) {

		$templateCache.put( 'backofficeMediaGroupComponentTemplate.html',

			'<div class=\'backoffice-media-group-component\'>' +

				'<div class=\'row\'>' +
					'<div class=\'col-md-12\'>' +

						'<ol class=\'clearfix\' data-drag-drop-list>' +
							'<li data-ng-repeat=\'medium in backofficeMediaGroupComponent.media\' draggable=\'true\'>' +
								'<div data-ng-if=\'medium.image\'>' +
									'<button data-ng-click=\'backofficeMediaGroupComponent.removeMedium(medium)\'>&times;</button>' +
									'<img data-ng-attr-src=\'{{medium.image.url}}\'>' +
								'</div>' +
								'<div data-ng-if=\'medium.video && medium.video.videoType.identifier === "youtube"\'>' +
									'<button data-ng-click=\'backofficeMediaGroupComponent.removeMedium(medium)\'>&times;</button>' +
									'<img data-ng-attr-src=\'http://img.youtube.com/vi/{{medium.video.uri}}/0.jpg\'>' +
								'</div>' +
							'</li>' +
						'</ol>' +

					'</div>' +
				'</div>' +

				'<div class=\'row\'>' +
					'<div class=\'col-md-12\'>' +

						'<div class="relation-select" ' +
							'data-relation-input ' +
							'data-ng-attr-data-relation-entity-endpoint="{{backofficeMediaGroupComponent.propertyName}}" ' +
							'data-relation-interactive="false" ' +
							'data-deletable="false" ' +
							'data-relation-entity-search-field="title" ' +
							'data-relation-suggestion-template="[[title]] <img src=\'[[image.url]]\'/>" ' +
							'data-ng-model="backofficeMediaGroupComponent.addMediumModel" ' +
							'data-multi-select="true">' +
						'</div>' +

					'</div>' +
					/*'<div class=\'col-md-3\'>' +

						'<button class="btn btn btn-success" data-ng-attr-ui-sref="app.detail({entityName:\'{{backofficeMediaGroupComponent.propertyName}}\',entityId:\'new\'})">{{ \'web.backoffice.mediumGroup.createMedium\' | translate }}</button>' +

					'</div>' +*/
				'</div>' +
			'</div>'

		);

	} ] );


} )();


/**
 * New reference component.
 *
 * The relation input forces us to set the entity url during the rendering of the template, which means we have to postpone
 * the rendering and recompile as soon as we
 */
(function (undefined) {

    'use strict';

    var _module = angular.module('jb.backofficeFormComponents');

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
                }
            };
        };
    }

    _module.directive('referenceComponent' , [createBaseDirective('BackofficeReferenceController')]);
    _module.directive('relationComponent'  , [createBaseDirective('BackofficeRelationController')]);

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
    function BackofficeReferenceController($scope, $attrs, $compile, $templateCache, componentsService, relationService) {
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
    }

    BackofficeReferenceController.prototype.preLink = function () {

    };
    BackofficeReferenceController.prototype.postLink = function (scope, element, attrs) {
        this.subcomponentsService.registerComponent(scope, this);
        this.element = element;
    };

    BackofficeReferenceController.prototype.registerAt = function (parent) {
        parent.registerOptionsDataHandler(this.handleOptionsData.bind(this));
        parent.registerGetDataHandler(this.handleGetData.bind(this));
    };

    BackofficeReferenceController.prototype.getEndpoint = function () {
        return this.relationName;
    };

    // @todo: catch it if the options are not found
    // @todo: make this method abstract and implement it for the reference as well as the relation
    BackofficeReferenceController.prototype.handleGetData = function (data) {
        this.currentData = [];
        if (data && data[this.relationName]) {
            var selectedData = data[this.relationName];
            if(!angular.isArray(selectedData)){
                selectedData = [selectedData];
            }
            this.currentData = selectedData;
        }
        this.originalData = angular.copy(this.currentData);
        console.log('BackofficeReferenceComponentController: Model updated (updateData) to %o', this.currentData);
    };

    // @todo: make this method abstract and implement it for reference as well as relation
    BackofficeReferenceController.prototype.getSpec = function(data){
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
                if(data.internalReferences[i].entity == this.entityName) return data.internalReferences[i];
            }
            return spec;
        }
        // we can also just specify the relation name directly (which might be the same as the entity name)
        if(this.relationName) return data[this.relationName];
        return spec;
    };

    BackofficeReferenceController.prototype.handleOptionsData = function (data) {

        var fieldSpec = this.getSpec(data);
        if (!angular.isDefined(fieldSpec)) {
            return console.error(
                'BackofficeReferenceController: No options data found for name %o referencing entity %o.'
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
    BackofficeReferenceController.prototype.isMultiSelect = function(){
        return false;
    };
    /**
     * Renders the current directive by modifying the template and recompiling the content of the current component.
     *
     * This is a rather hacky way of injecting the content but sadly the 'relation-input' directive does not properly
     * access/evaluate all of its parameters and therefore not all values are correctly interpreted if inserted using
     * bindings within the template.
     */
    BackofficeReferenceController.prototype.renderComponent = function(){
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
            .attr( 'ng-model', '$ctrl.currentData' )
            .attr( 'multi-select', this.isMultiSelect() );

        this.$compile( template )( this.$scope );
        this.element.prepend( template );
    };

    BackofficeReferenceController.prototype.isInteractive = function(){
        return true;
    };

    BackofficeReferenceController.prototype.isDeletable = function(){
        return true;
    };

    BackofficeReferenceController.prototype.getLabel = function () {
        if (this.label) return this.label;
        return this.propertyName;
    };

    BackofficeReferenceController.prototype.getSelectFields = function () {
        var   selectFields   = this.relationService.extractSelectFields(this.getSuggestionTemplate())
            , prefixedFields = selectFields.map(function (field) {
                return [this.relationName, field].join('.');
            }, this);

        if(this.propertyName) prefixedFields.unshift(this.propertyName);

        return prefixedFields;
    };

    BackofficeReferenceController.prototype.isRequired = function () {
        if (!this.options) return true;
        return this.options.required === true;
    };

    BackofficeReferenceController.prototype.isMultiSelect = function () {
        return false;
    };

    BackofficeReferenceController.prototype.getSuggestionTemplate = function () {
        return this.suggestion;
    };

    BackofficeReferenceController.prototype.getSearchField = function(){
        return this.searchField;
    };

    BackofficeReferenceController.prototype.isValid = function(){
        if(this.isRequired()) return this.currentData.length > 0;
        return true;
    };

    BackofficeReferenceController.prototype.getSaveCalls = function(){

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

    function BackofficeRelationController($scope, $attrs, $compile, $templateCache, componentsService, relationService){
        BackofficeReferenceController.call(this, $scope, $attrs, $compile, $templateCache, componentsService, relationService);
    }

    /**
     *
     * @type {BackofficeReferenceController}
     */
    BackofficeRelationController.prototype = Object.create(BackofficeReferenceController.prototype);
    BackofficeRelationController.prototype.constructor = BackofficeRelationController;
    BackofficeRelationController.prototype.isMultiSelect = function(){
        return true;
    };

    BackofficeRelationController.prototype.getSpec = function(data){
        // No data available
        if(!data) return;

        if(this.relationName) return data[this.relationName];
        return data[this.entityName];
    };
    /**
     * @todo: this might be implemented as a post-save call to ensure that
     * @returns {*}
     */
    BackofficeRelationController.prototype.getSaveCalls = function(){

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
    BackofficeRelationController.prototype.mapProperties = function(collection, property){
        return collection.reduce(function(map, item){
            map[item[property]] = item;
            return map;
        }, {});
    };

    _module.controller('BackofficeReferenceController', [
          '$scope'
        , '$attrs'
        , '$compile'
        , '$templateCache'
        , 'backofficeSubcomponentsService'
        , 'RelationInputService'
        , BackofficeReferenceController
    ]);

    _module.controller('BackofficeRelationController', [
          '$scope'
        , '$attrs'
        , '$compile'
        , '$templateCache'
        , 'backofficeSubcomponentsService'
        , 'RelationInputService'
        , BackofficeRelationController
    ]);

    _module.run(['$templateCache', function ($templateCache) {
        $templateCache.put('referenceComponentTemplate.html',
            '<div class="form-group">' +
            '<label backoffice-label label-identifier="{{$ctrl.getLabel()}}" is-required="$ctrl.isRequired()" is-valid="$ctrl.isValid()"></label>' +
            '<div relation-input class="relation-select col-md-9"></div>' +
            '</div>');
    }]);
})();
/**
* Newer version of jb-auto-relation-input. Is not automatically replaced by auto-form-element any more, 
* but needs to be used manually. Gives more freedom in usage. 
* Don't use ngModel as it can't properly deep-watch, especially not through $render
*/
( function() {

	'use strict';

	angular

	.module( 'jb.backofficeFormComponents' )

	/**
	* <input data-backoffice-relation-component
	*	data-suggestion-template="[[property]]"
	* 	data-search-field="property"
	*	data-ng-model="model" // Optional
	*	data-for="enity">
	*/
	.directive( 'backofficeRelationComponent', [ function() {

		return {
			require				: [ 'backofficeRelationComponent', '^detailView' ]
			, controller		: 'BackofficeRelationComponentController'
			, controllerAs		: 'backofficeRelationComponent'
			, bindToController	: true
			, link				: function( scope, element, attrs, ctrl ) {
				ctrl[ 0 ].init( scope, element, attrs, ctrl[ 1 ] );
			}
			, scope: {
				'suggestionTemplate'	: '@'
				, 'searchField'			: '@'
				, 'propertyName'		: '@for'
			//	, 'relationModel'		: '=ngModel' Caused error since angular 1.4.fuckyou
			}

		};

	} ] )

	.controller( 'BackofficeRelationComponentController', [
            '$scope',
            '$compile',
            '$templateCache',
            'RelationInputService',
            'backofficeFormEvents',
            function( $scope, $compile, $templateCache, RelationInputService, formEvents ) {

		var self = this
			, _element
			, _detailViewController

			// Data gotten from options call: 
			// - is value required? 
			// - is relation deletable? 
			// - is it a multi or single select field?
			, _required
			, _deletable
			, _multiSelect

			// Entity can have an alias: Another name where we have to SAVE the data to, 
			// but cannot get data from – e.g. media -> medium for blogPosts (as medium 
			// is already taken for the main image)
			// If there is an alias, self.propertyName is the alias, _entityName the original
			// entity name to get data from.
			, _entityName

			// Original data gotten from server; needed to calculate differences
			// (when storing data)
			, _originalData;

		// Model for relationInput
		self.relationModel  = undefined;
        self.formEvents     = formEvents;



		/**
		* Called by link function
		*/
		self.init = function( scope, element, attrs, detailViewCtrl ) {

			_element = element;
			_detailViewController = detailViewCtrl;
            scope.$emit(self.formEvents.registerComponent, self);
		};

                self.registerAt = function(parent){
                    // Registers itself with detailViewController
                    parent.registerOptionsDataHandler( self.updateOptionsData );
                    parent.registerGetDataHandler( self.updateData );
                };

		/**
		* GET data gotten from detailView
		*/
		self.updateData = function( data ) {

			var modelValue;

			if( !data || !data[ self.propertyName ] ) {
				modelValue = [];
			}
			else {
				modelValue = angular.isArray( data[ self.propertyName ] ) ? data[ self.propertyName ] : [ data[ self.propertyName ] ];
			}

			self.relationModel = modelValue;
			// Store data in _originalData to calculate differences when saving
			_originalData = angular.copy( modelValue );

			console.log( 'BackofficeRelationComponentController: Model updated (updateData) to %o', self.relationModel );

		};




        /**
		 * Extracts the options data and injects the element itself.
		 */
		self.updateOptionsData = function( data ) {
			
			console.log( 'BackofficeRelationComponentController: Got options data %o', data[ self.propertyName ] );

			var elementData		= data[ self.propertyName ];

			_deletable			= elementData.originalRelation !== 'belongsTo';	
			_required			= elementData.required;
			_multiSelect		= elementData.relationType !== 'single';

			if( elementData.alias ) {
				_entityName = elementData.relation;
			}
			else {
				_entityName = self.propertyName;
			}
            // @todo: it might be better to insert the element
			self.replaceElement( _multiSelect, _deletable );
		};


		/**
		* Returns the select statement for the GET call
		* Use the RelationInputService from the relationInput to determine select fields depending on the 
		* suggestionTemplate.
		*/
		self.getSelectFields = function() {

			var selectFields				= RelationInputService.extractSelectFields( self.suggestionTemplate )

			// Select fields prefixed with the entity's name
				, prefixedSelectFields		= [];
			// @todo: this only makes sense if the property name is the same as the entity!
			selectFields.forEach( function( selectField ) {
				prefixedSelectFields.push( self.propertyName + '.' + selectField );
			} );

			return prefixedSelectFields;

		};

		/**
		 * Replaces itself with the relation-input element.
		 * Queries the template and injects the necessary values.
         * And replaces itself with the relation input and sets the endpoint based on the current entity name.
         *
         * @todo: resolve the endpoint using a service
		 */
		self.replaceElement = function( multiSelect, deletable ) {
            // This happens synchronously, and is therefore not a problem
			var template = $( $templateCache.get( 'backofficeRelationComponentTemplate.html') );

			template
				.find( '[data-relation-input]')
				.attr( 'data-relation-entity-endpoint', _entityName )
				.attr( 'data-relation-interactive', true )
				.attr( 'data-deletable', deletable )
				.attr( 'data-relation-entity-search-field', self.searchField )
				.attr( 'data-relation-suggestion-template', self.suggestionTemplate )
				.attr( 'data-ng-model', 'backofficeRelationComponent.relationModel' )
				.attr( 'data-multi-select', multiSelect );

			_element.replaceWith( template );
			$compile( template )( $scope );
		};


		self.isRequired = function() {
			return _required;
		};

		self.isValid = function() {

			// May return 1; therefore use !! to convert to bool.
			var valid = !!( !_required || ( _required && self.relationModel && self.relationModel.length ) );
			console.log( 'BackofficeRelationComponentController: isValid? %o', valid );
			return valid;

		};







		self.getSaveCalls = function() {

			var saveCalls = _multiSelect ? self.getMultiSelectSaveCalls() : self.getSingleSelectSaveCalls();

			console.log( 'BackofficeRelationComponentController: saveCalls are %o', saveCalls );
			return saveCalls;

		};






		/**
		* Creates requests for a single relation. 
		* No delete calls needed.
		*/
		self.getSingleSelectSaveCalls = function() {


			// Relations missing; happens if relations were not set on server nor changed
			// by user
			if( !self.relationModel ) {
				console.log( 'AutoRelationInputController: relationModel empty' );
				return false;
			}


			// Element is required: It MUST be stored when main entity is created through POSTing to 
			// the main entity with id_entity. It may not be deleted, therefore on updating, a PATCH
			// call must be made to the main entity (and not DELETE/POST)
			if( _required ) {

				// No changes happened: return false
				if( self.relationModel && _originalData ) {

					// No values
					if( self.relationModel.length === 0 && _originalData.length === 0 ) {
						console.log( 'BackofficeRelationComponentController: No changes and no relations for required relation %o', self.propertyName );
						return false;
					}

					// Same value
					if( self.relationModel.length && _originalData.length && self.relationModel[ 0 ] && _originalData[ 0 ] && self.relationModel[ 0 ].id === _originalData[ 0 ].id ) {
						console.log( 'BackofficeRelationComponentController: No changes on required relation %o', self.propertyName );
						return false;
					}

				}




				var relationData = {};
				relationData[ 'id_' + self.propertyName ] = self.relationModel[ 0 ].id;


				// Creating main entity
				if( !_detailViewController.getEntityId() ) {

					return {
						url			: false // Use main entity URL
						, method	: 'POST'
						, data		: relationData
					};
				}

				// Updating main entity
				else {
					return {
						url			: false // Use main entity URL
						, method	: 'PATCH'
						, data		: relationData
					};
				}

			}


			// Element was removed
			if( self.relationModel.length === 0 && _originalData && _originalData.length !== 0 ) {
				return {
					// self.propertyName must be first (before _detailViewController.getEntityName()) as the server handles stuff the same way – 
					// and ESPECIALLY for entities with an alias.
					url					: { 
						path			: '/' + self.propertyName + '/' + _originalData[ 0 ].id
						, mainEntity	: 'append'
					}
					, method			: 'DELETE'
				};
			}

			// Update
			// When scope.data[ 0 ].id != _originalData[ 0 ].id 
			// Only [0] has to be checked, as it's a singleSelect
			if( self.relationModel.length ) {
				
				if( !_originalData || !_originalData.length || ( _originalData.length && self.relationModel[ 0 ].id !== _originalData[ 0 ].id ) ) {
				
					var data = {};
					data[ _detailViewController.fields[ self.propertyName ].relationKey ] = self.relationModel[ 0 ].id;

					// Post to /mainEntity/currentId/entityName/entityId, path needs to be entityName/entityId, 
					// is automatically prefixed by DetailViewController 
					return {
						url					:  {
							path			:'/' + self.propertyName + '/' + self.relationModel[ 0 ].id
							, mainEntity	: 'append'
						}
						, method			: 'POST'
					};
			
				}

			}

			// No changes
			return false;

		};




		self.getMultiSelectSaveCalls = function() {

			// Deletes & posts

			// Select deleted and added elements
			// Just for console.log
			var deleted		= []
				, added		= [];

			var originalIds	= []
				, newIds	= []
				, calls		= [];

			// Make arrays of objects to arrays of ids
			if( self.relationModel && self.relationModel.length ) {
				self.relationModel.forEach( function( item ) {
					newIds.push( item.id );
				} );
			}
			if( _originalData && _originalData.length ) {
				_originalData.forEach( function( item ) {
					originalIds.push( item.id );
				} );
			}


			// Deleted: in _originalData, but not in newData
			originalIds.forEach( function( item ) {
				if( newIds.indexOf( item ) === -1 ) {
					deleted.push( item );
					calls.push( {
						method				: 'DELETE'
						, url				: {
							path			: self.propertyName + '/' + item
							, mainEntity	: 'append'
						}
					} );
				}
			}.bind( this ) );

			// Added: in newData, but not in _originalData

			newIds.forEach( function( item ) {
				if( originalIds.indexOf( item ) === -1 ) {
					added.push( item );
					calls.push( {
						method				: 'POST'
						, url				: {
							path			: '/' + self.propertyName + '/' + item
							, mainEntity	: 'append'
						}
					} );
				}
			}.bind( this ) );

			console.log( 'BackofficeRelationComponentController: Added %o, deleted %o – calls: %o', added, deleted, calls );

			if( calls.length === 0 ) {
				return false;
			}

			return calls;

		};





	} ] )


	.run( [ '$templateCache', function( $templateCache ) {

		$templateCache.put( 'backofficeRelationComponentTemplate.html',
			'<div class=\'form-group\'>' +
				'<label data-backoffice-label ' +
					'data-label-identifier=\'{{backofficeRelationComponent.propertyName}}\' ' +
					'data-is-required=\'backofficeRelationComponent.isRequired()\' ' +
					'data-is-valid=\'backofficeRelationComponent.isValid()\'>' +
				'</label>' +
				'<div data-relation-input ' +
					'class=\'relation-select col-md-9\'>' +
				'</div>' +
			'</div>'
		);

	} ] );
} )();


/**
* As a tree is a simple relation on the entity it belongs to, we have to create a component
* that is not initialized through auto-form
*/
angular
.module( 'jb.backofficeFormComponents' )
.directive( 'backofficeTreeComponent', [ function() {

	return {
		require				: [ '^detailView', 'backofficeTreeComponent' ]
		, controller		: 'TreeComponentController'
		, link				: function( scope, element, attrs, ctrl ) {
			
			ctrl[ 1 ].init( element, ctrl[ 0 ] );
		
		}
		, templateUrl		: 'treeTemplate.html'
		, scope				: {
			// Filter: When making GET call, filter is applied, e.g id_menu=5. Is needed if 
			// the nested set is grouped (e.g. menuItems might be grouped by menu). 
			// If data is stored, filter is passed through POST call to the server; 
			// { id: 5, children[ { id: 2 } ] } becomes { id: 5, id_menu: 3, children[ { id: 2, id_menu: 3 } ] } 
			filter			: '=treeComponentFilter'
			, labelName		: '@treeComponentLabel'
			, entityName	: '@for'
			, maxDepth		: '@'
		}
		, bindToController	: true
		, controllerAs		: 'treeComponentController'
	};

} ] )


.controller( 'TreeComponentController', [ '$scope', '$rootScope', '$attrs', '$location', '$q', 'APIWrapperService', function( $scope, $rootScope, $attrs, $location, $q, APIWrapperService ) {

	var self			= this
		, element
		, detailViewController
		, maxDepth		= $attrs.maxDepth || 10;

	self.dataTree		= undefined;

	
	if( !self.labelName || !self.entityName ) {
		console.warn( 'TreeComponentController: labelName or entityName (for) attribute missing' );
	}


	/**
	* Called when user clicks pencil on a list item 
	*/
	self.editEntity = function( ev, id ) {
		
		ev.preventDefault();
		$location.path( '/' + $attrs.for + '/' + id );

	};


	// Called by link function
	self.init = function( el, detViewCtrl ) {

		element					= el;
		detailViewController	= detViewCtrl;

		detailViewController.register( self );

		self.getData();

	};




	/**
	* If we get data through the detailViewController (self.select/registerGetDataHandler)
	* we can't pass a range argument. The menu might be much l
	*/
	self.getData = function() {

		// Create headers
		var headers = {
			range		: '0-0'
		};

		if( self.filter ) {
			var filter = '';
			for( var i in self.filter ) {
				filter = i + '=' + self.filter[ i ];
			}
			headers.filter = filter;
		}

		// Make GET request
		APIWrapperService.request( {
			method			: 'GET'
			, url			: '/' + self.entityName
			, headers		: headers
		} )
		.then( function( data ) {

			self.updateData( data );

		}, function( err ) {
			$rootScope.$broadcast( 'notification', {
				type				: 'error'
				, message			: 'web.backoffice.detail.loadingError'
				, variables			: {
					errorMessage	: err
				}
			} );
		} );

	};





	/**
	* Listens for data gotten in getData
	*/
	self.updateData = function( data ) {

		self.dataTree = getTree( data );
		console.log( 'TreeComponentController: dataTree is %o', self.dataTree );

		// Wait for template to be rendered
		setTimeout( function() {
		
			// Add class required for jQuery plugin			
			element.addClass( 'dd' );

			// Add jQuery plugin
			element.nestable( {
				dragClass				: 'dd-dragelement'
				, placeClass			: 'dd-placeholder'
				, maxDepth				: self.maxDepth
			} );

		}, 500 );
		
	};






	/**
	* Returns data to be stored. There's a special JSON POST call available to store a tree. 
	*/
	self.getSaveCalls = function() {
		
		var treeData = element.nestable( 'serialize' );
		console.log( 'TreeComponentController: Store data %o', treeData );

		var cleanedTreeData = self.cleanTreeData( treeData );
		console.log( 'TreeComponentController: Cleaned data %o, got %o', treeData, cleanedTreeData );

		return {
			method				: 'POST'
			, headers			: {
				'Content-Type'	: 'application/json'
			}
			, url				: '/' + self.entityName
			, data				: cleanedTreeData
		};

	};




	/**
	* nestable('serialize') returns data with a lot of junk on it – remove it and only leave
	* the properties «id» and «children» left. Recurive function.
	* originalTreeData, as serialized by nestable('serialize') is an object with keys 0, 1, 2, 3… 
	* and not an array.
	*/
	self.cleanTreeData = function( originalTreeData, cleaned ) {

		if( !cleaned ) {
			cleaned = [];
		}

		for( var i in originalTreeData ) {

			var branch = originalTreeData[ i ];

			var cleanBranch = {};
			cleanBranch.id = branch.id;

			// If filter was set, add it to the data that will be sent to the server. 
			if( self.filter ) {

				for( var j in self.filter ) {
					cleanBranch[ j ] = self.filter[ j ];
				}

			}

			// Children: Recursively call cleanTreeData
			if( branch.children ) {
				cleanBranch.children = [];
				self.cleanTreeData( branch.children, cleanBranch.children );
			}

			cleaned.push( cleanBranch );

		}

		return cleaned;

	};









	/* https://github.com/joinbox/eb-service-generics/blob/master/controller/MenuItem.js */
    var getTree = function(rows) {

        var rootNode = {};

        // sort the nodes
        rows.sort(function(a, b) {return a.left - b.left;});

        // get the tree, recursive function
        buildTree(rootNode, rows);

        // return the children, the tree has no defined root node
        return rootNode.children;

    };


    var buildTree = function(parentNode, children) {
        var   left          = 'left'
            , right         = 'right'
            , nextRight     = 0
            , nextChildren  = []
            , parent;

        if (!parentNode.children) {parentNode.children = [];}

        children.forEach(function(node) {
            if (node[right] > nextRight) {
                // store next rigth boundary
                nextRight = node[right];

                // reset children array
                nextChildren = [];

                // add to parent
                parentNode.children.push(node);

                // set as parent
                parent = node;
            }
            else if (node[right]+1 === nextRight) {
                nextChildren.push(node);

                // rcursiveky add chuildren
                buildTree(parent, nextChildren);
            }
            else { nextChildren.push(node);}
        });
    };



} ] )




// Base template: create data-tree-form-element-list
.run( function( $templateCache ) {

	$templateCache.put( 'treeBranchTemplate.html',
		'<div class=\'dd-handle\'>' +
			'<span data-ng-if=\'branch[ treeComponentController.labelName ]\'>{{ branch[ treeComponentController.labelName ] }}</span>' +
			'<span data-ng-if=\'!branch[ treeComponentController.labelName ]\'>N/A</span>' +
		'</div>' +
		'<button class=\'fa fa-pencil btn btn-link edit\' data-ng-click=\'treeComponentController.editEntity($event,branch.id)\'></button>' +
		'<ol data-ng-if=\'branch.children\' class=\'dd-list\'>' +
			'<li data-ng-repeat=\'branch in branch.children\' data-ng-include=\'"treeBranchTemplate.html"\' class=\'dd-item\' data-id=\'{{ branch.id }}\'>' +
			'</li>' +
		'</ol>'
	);

	$templateCache.put( 'treeTemplate.html',
		'<ol>' +
			'<li data-ng-repeat=\'branch in treeComponentController.dataTree\' data-ng-include=\'"treeBranchTemplate.html"\' class=\'dd-item\' data-id=\'{{ branch.id }}\'>' +
			'</li>' +
		'</ol>'
	);

} );
/***
* TBD!
*/


/**
* Component for integrating videos within an existing site (e.g. medium). 
* - Add, remove and edit an existing video.
* - Store relation on the parent entity.
*/
( function() {

	'use strict';

	angular

	.module( 'jb.backofficeFormComponents' )

	.directive( 'backofficeVideoComponent', [ function() {

		return {
			require				: [ 'backofficeVideoComponent', '^detailView' ]
			, controller		: 'BackofficeVideoComponentController'
			, controllerAs		: 'backofficeVideoComponent'
			, bindToController	: true
			, templateUrl		: 'backofficeVideoComponentTemplate.html'
			, link				: function( scope, element, attrs, ctrl ) {
				ctrl[ 0 ].init( element, ctrl[ 1 ] );
			}
			, scope: {
				'propertyName'		: '@for'
			}

		};

	} ] )

	.controller( 'BackofficeVideoComponentController', [ '$scope', '$rootScope', '$q', 'APIWrapperService', function( $scope, $rootScope, $q, APIWrapperService ) {

		var self = this
			, _element
			, _detailViewController

			, _originalData;

		self.images = [];

		self.init = function( el, detailViewCtrl ) {

			_element = el;
			_detailViewController = detailViewCtrl;

			_detailViewController.registerOptionsDataHandler( self.updateOptionsData );
			_detailViewController.registerGetDataHandler( self.updateData );

		};

		/**
		* Called with GET data
		*/
		self.updateData = function( data ) {
			
			console.error( data );

		};




		/**
		* Called with OPTIONS data 
		*/
		self.updateOptionsData = function( data ) {

			_detailViewController.register( self );

		};


		/**
		* Returns the fields that need to be selected on the GET call
		*/
		self.getSelectFields = function() {

			return [ self.propertyName + '.*' ];

		};




		/**
		* Store/Delete files that changed.
		*/
		self.getSaveCalls = function() {

			return false;

		};



		/**
		* Upload all image files
		*/
		self.beforeSaveTasks = function() {


		};






	} ] )



	.run( [ '$templateCache', function( $templateCache ) {

		$templateCache.put( 'backofficeVideoComponentTemplate.html',
			// data-backoffice-component: detailView waits with making the GET call until this element registered itself.
			'<div class=\'row\'>' +
				'<label data-backoffice-label data-label-identifier=\'{{backofficeImageComponent.propertyName}}\' data-is-required=\'false\' data-is-valid=\'true\'></label>' +
				'VIDEO' +
			'</div>'
		);

	} ] );


} )();


(function(){
    var mod = angular.module('jb.backofficeFormEvents', []);
    mod.provider('backofficeFormEvents', function BackofficeFormEventProvider(){
        var eventKeys = {
            // used to register components, e.g. at the detail view
            registerComponent: 'jb.backoffice-form-event.registerComponent'
        };

        this.setEventKey = function(accessor, key){
            eventKeys[accessor] = key;
        };

        this.hasEventKeyAt = function(accessor){
            return angular.isDefined(eventKeys[accessor]);
        };

        this.getEventKeyAt = function(accessor){
            return eventKeys[accessor];
        };

        this.removeEventKey = function(accessor){
            delete eventKeys[accessor];
        } ;

        this.$get = [function(){
            return Object.freeze(eventKeys);
        }];
    });

    function BackofficeSubcomponentsRegistry($q, formEvents, scope){
        this.registeredComponents = [];
        this.scope = scope;
        this.optionsDataHandlers   = [];
        this.getDataHandlers        = [];
        this.$q = $q;
        this.formEvents = formEvents;
    }

    BackofficeSubcomponentsRegistry.prototype.listen = function(){
        this.scope.$on(this.formEvents.registerComponent, function(event, component){
            console.log('REGISTRATION OF:', component);
            if(component === this) return;
            event.stopPropagation();
            this.registerComponent(component);
        }.bind(this));
        return this;
    };

    BackofficeSubcomponentsRegistry.prototype.registerComponent = function(component){
        this.registeredComponents.push(component);
        component.registerAt(this);
    };

    BackofficeSubcomponentsRegistry.prototype.getSaveCalls = function(){
        return this.registeredComponents.reduce(function(calls, component){
            return calls.concat(component.getSaveCalls());
        }, []);
    };

    BackofficeSubcomponentsRegistry.prototype.isValid = function(){
        for(var i = 0; i < this.registeredComponents.length; i++){
            if(this.registeredComponents[i].isValid() === false) return false;
        }
        return true;
    };

    BackofficeSubcomponentsRegistry.prototype.getAfterSaveTasks = function(){
        var calls = this.registeredComponents.reduce(function(subcalls, component){
            if(angular.isFunction(component.afterSaveTasks)){
                return subcalls.concat(component.afterSaveTasks());
            }
            return subcalls;
        });
        return this.$q.all(calls);
    };

    BackofficeSubcomponentsRegistry.prototype.getBeforeSaveTasks = function(){
        var calls = this.registeredComponents.reduce(function(subcalls, component){
            if(angular.isFunction(component.beforeSaveTasks)){
                return subcalls.concat(component.beforeSaveTasks());
            }
            return subcalls;
        });
        return this.$q.all(calls);
    };

    BackofficeSubcomponentsRegistry.prototype.getSelectFields = function () {
        return this.registeredComponents.reduce(function (selects, component) {
            if (angular.isFunction(component.getSelectFields)) return selects.concat(component.getSelectFields());
            if (angular.isDefined(component.select)) return selects.concat(component.select);
            return selects;
        }, []);
    };
    /**
     * @todo: make use of promises!
     * @param datasdsdf
     */
    BackofficeSubcomponentsRegistry.prototype.optionsDataHandler = function(data){
        this.optionsDataHandlers.forEach(function(handler){
            handler(data);
        });
    };

    BackofficeSubcomponentsRegistry.prototype.registerOptionsDataHandler = function(handler){
        this.optionsDataHandlers.push(handler);
    };

    BackofficeSubcomponentsRegistry.prototype.registerGetDataHandler = function(handler){
        this.getDataHandlers.push(handler);
    };

    BackofficeSubcomponentsRegistry.prototype.unregisterGetDataHandler = function(handler){
        this.getDataHandlers.splice(this.getDataHandlers.indexOf(handler), 1);
    };

    BackofficeSubcomponentsRegistry.prototype.unregisterOptionsDataHandler = function(handler){
        this.optionsDataHandlers.splice(this.optionsDataHandlers.indexOf(handler), 1);
    };

    BackofficeSubcomponentsRegistry.prototype.getDataHandler = function(data){
        this.getDataHandlers.forEach(function(handler){
            handler(data);
        });
    };

    BackofficeSubcomponentsRegistry.prototype.registerYourself = function(scope){
        (scope || this.scope).$emit(this.formEvents.registerComponent, this);
    };

    BackofficeSubcomponentsRegistry.prototype.registerAt = function(parent){
        parent.registerOptionsDataHandler(this.optionsDataHandler.bind(this));
        parent.registerGetDataHandler(this.getDataHandler.bind(this));
    };

    mod.factory(
        'backofficeSubcomponentsService' ,
        [
            '$q' ,
            'backofficeFormEvents' ,
            function($q, formEvents){
                return {
                    registryFor   : function(scope){
                        var registry = new BackofficeSubcomponentsRegistry($q, formEvents, scope);
                        return registry;
                    }
                    , registerComponent : function(scope, component){
                        scope.$emit(formEvents.registerComponent, component);
                    }
                }
            }
        ]);
})();
(function (undefined) {
    "use strict";

    var _module = angular.module('jb.backofficeAutoFormElement');

    _module.controller('backofficeLabelController', ['$scope', function ($scope) {
        this.$scope = $scope;
    }]);

    _module.directive('backofficeLabel', ['$templateCache', '$compile', function ($templateCache, $compile) {
        return {
            link: function ($scope, element, attrs, ctrl) {
                var tpl = angular.element($templateCache.get('backofficeLabelTemplate.html'));
                element.replaceWith(tpl);
                $compile(tpl)($scope);
            }
            , scope: {
                  labelIdentifier: '@'
                , isRequired: '&'
                , isValid: '&'
            }
        };
    }]);

    _module.run(function ($templateCache) {
            $templateCache.put('backofficeLabelTemplate.html',
                '<div class="col-md-3">' +
                    '<label class="control-label" data-ng-class="{invalid: !isValid()}">' +
                        '<span data-ng-if="isRequired()||required" class="required-indicator">*</span>' +
                        '<span data-translate="{{labelIdentifier}}"></span>' +
                    '</label>' +
                '</div>'
            );
        });
})();
(function(undefined) {
    'use strict';

    /**
     * Directive for every detail view:
     * - Gets field data from server (through an OPTIONS call)
     * - Input components (text, images, relations) may register themselves
     * - Stores data on server
     *
     * Child components must/may implement the following methods:
     * - register: When all components were registered, GET call is made.
     *             To be called after OPTION data was processed by component.
     * - registerOptionsDataHandler: get OPTION data (optional)
     * - registerGetDataHandler: get GET data (optional)
     * - getSaveCalls: Returns POST calls (optional)
     * - isValid: Returns true if component is valid (optional)
     * - getSelectFields: Returns select fields (replaces the select property)
     */

    angular
        .module('jb.backofficeDetailView', ['jb.apiWrapper', 'pascalprecht.translate', 'jb.backofficeFormEvents'])
        .directive('detailView', [function () {

            return {
                link: {
                    pre: function (scope, element, attrs, ctrl) {
                        if (angular.isFunction(ctrl.preLink)) {
                            ctrl.preLink(scope, element, attrs);
                        }
                    }
                    , post: function (scope, element, attrs, ctrl) {
                        scope.detailViewController = ctrl;
                        ctrl.init(scope, element, attrs);
                        // Expose controller to DOM element; needed e.g. to manually save
                    }

                }
                , controller: 'DetailViewController'

                // Parent inheritance is needed for events (save, remove) to be handled and
                // properties to be exposed to DOM (?)
                // Problematic if we have nested detailViews (e.g. in articles on CC)
                // But true is needed to access entityId of a parent detailView (e.g. to filter in a
                // nested detailView)
                , scope: true
            };

        }])

        .controller('DetailViewController',
        ['$scope'
            , '$rootScope'
            , '$q'
            , '$attrs'
            , '$filter'
            , '$state'
            , 'APIWrapperService'
            , 'backofficeFormEvents'
            , 'BackofficeAPIWrapperService'
            , function ($scope, $rootScope, $q, $attrs, $filter, $state, APIWrapperService, formEvents, boAPIWrapper) {


            /**
             * Private vars
             */

            var scope = $scope.$new()
                , self = this

            // Number of [data-auto-form-element] elements;
            // get data only when all elements have registered
            // themselves
                , autoFormElementCount = 0

            // Element directive belongs to, set on init
                , element

            // Handlers that will be called on OPTIONs and GET data received,
            // registered from sub-components through
            // - self.registerOptionsDataHandler( callback )
            // - self.registerGetDataHandler( callback )
                , optionHandlers = []
                , getHandlers = [];


            //////////////////////////////////////////////////////////////////////////
            //
            // Public vars
            //

            // Components registered for this view
            self.registeredComponents = [];


            /**
             * Parsed data from OPTIONS call
             * - key            : field's name
             * - value        : {
	*	type		: 'text|email|int|image|singleRelation|multiRelation'
	*	, required	: true
	*	, etc.
	* }
             */
            self.fields = undefined;

            // Data from GET call
            self.data = undefined;


            //////////////////////////////////////////////////////////////////////////
            //
            // Scope vars
            //
            $scope.entityId = undefined;
            $scope.entityName = undefined;

            $scope.title = undefined;


            self.preLink = function (scope, element, attrs) {
                console.info('PRE LINK');
                scope.$on(formEvents.registerComponent, function (event, child) {
                    if (child !== self) {
                        console.log('REGISTER: ', child);
                        event.stopPropagation();
                        self.register(child);
                        child.registerAt(self);
                    }
                });
            };


            //////////////////////////////////////////////////////////////////////////
            //
            // Entity ID
            //

            // Entity ID and name are taken from URL (on init) or from attribute (on change) and stored
            // in self.entityId and self.entityName

            /**
             * Parses current URL and looks for entityName and entityId.
             *
             * @return <Object>        with properties name and id
             */
            self.parseUrl = function () {
                return {
                    name: $state.params.entityName
                    // Only return id if it's an ID (and not 'new'). If we return «new», a GET request will be made to /entityName/new
                    ,
                    id: ( $state.params.entityId && $state.params.entityId !== 'new' ) ? $state.params.entityId : false
                    ,
                    isNew: $state.params.entityId === 'new' ? true : false
                };

            };


            // Update entity whenever data-entity-id changes on element
            // Get data when attribute changes.
            $scope.$watch($attrs.entityId, function (val) {

                console.log('DetailViewController: $attrs.entityId changed to %o; if val exists, update $scope.entityId', val);

                if (val) {
                    $scope.entityId = val;
                    self.getData();
                }
            });

            if ($scope.$parent.$eval($attrs.entityId)) {
                $scope.entityId = $scope.$parent.$eval($attrs.entityId);
            }
            else {
                $scope.entityId = self.parseUrl().id;
            }


            // Name
            $scope.$watch($attrs.entityName, function (val) {

                console.log('DetailViewController: $attrs.entityName changed to %o; if val exists, update $scope.entityName', val);

                if (val) {
                    $scope.entityName = val;
                    self.getData();
                }
            });

            if ($scope.$parent.$eval($attrs.entityName)) {
                $scope.entityName = $scope.$parent.$eval($attrs.entityName);
            }
            else {
                $scope.entityName = self.parseUrl().name;
            }


            self.getEntityId = function () {
                return $scope.entityId;
            };

            self.getEntityName = function () {
                return $scope.entityName;
            };

            self.getEntityUrl = function () {
                var url = '/' + self.getEntityName();
                if (self.getEntityId()) {
                    url += '/' + self.getEntityId();
                }
                return url;
            };

            /**
             * Title
             */

            self.setTitle = function () {

                if (self.parseUrl().isNew) {
                    $scope.title = $filter('translate')('web.backoffice.create') + ': ';
                }
                else {
                    $scope.title = $filter('translate')('web.backoffice.edit') + ': ';
                }

                $scope.title += self.getEntityName();

                if (self.getEntityId()) {
                    $scope.title += ' #' + self.getEntityId();
                }
            };


            $scope.$watchGroup(['entityName', 'entityId'], function () {
                self.setTitle();
            });


            /**
             * Init (called from directive's link function)
             * @todo: emit the registration event
             */

            self.init = function (scope, el, attrs) {
                //now the subcomponents should be registered
                //scope.$emit(formEvents.registerComponent, self);

                element = el;

                // Store number of auto form elements
                // [data-backoffice-component]: Individual components that get and store data.
                var autoFormElements = element.find('[data-auto-form-element], [data-hidden-input], [data-backoffice-tree-component], [data-backoffice-relation-component], [data-backoffice-component], [data-backoffice-image-component], [data-backoffice-image-detail-component], [data-backoffice-video-component], [data-backoffice-date-component], [data-backoffice-media-group-component], [data-backoffice-data-component]');
                //var autoFormElements		= element.find( '[data-hidden-input], [data-backoffice-tree-component], [data-backoffice-relation-component], [data-backoffice-component], [data-backoffice-image-component], [data-backoffice-image-detail-component], [data-backoffice-video-component], [data-backoffice-date-component], [data-backoffice-media-group-component], [data-backoffice-data-component]' );

                // If element has a parent [data-detail-view] that is different from the current detailView, don't count elements.
                // This may happen if we have nested detailViews.
                autoFormElements.each(function () {
                    var closest = $(this).closest('[data-detail-view]');
                    if (closest.get(0) === element.get(0)) {
                        autoFormElementCount++;
                    }
                });
                /**
                 * Bypass the old variable
                 * @todo: remove that check as soon as all components are registered in the post-link phase.
                 */
                autoFormElementCount = this.registeredComponents.length;
                console.info('DETAIL VIEW POST LINK', autoFormElementCount);
                if (!$attrs.hasOwnProperty('entityId'))  return self.getOptionData();
                // getOptionData whenever entityId changes if entityId is on $attrs
                $attrs.$observe('entityId', self.getOptionData.bind(self));
            };


            //////////////////////////////////////////////////////////////////////////
            //
            // OPTION data
            //


            // Make OPTIONS call
            self.getOptionData = function () {

                console.log('DetailView: Make OPTIONS call for %o', self.getEntityName());

                self
                    .makeOptionRequest('/' + self.getEntityName())
                    .then(function (fields) {

                        self.fields = fields;

                        // As soon as a handler is called, it will be removed from optionHandlers through auto-form-element.
                        // Therefore splice is called; original array will be modified, elements will be missing -> make a
                        // copy first so that removed elements won't be missing.
                        var optionHandlersClone = optionHandlers.slice(0);
                        optionHandlersClone.forEach(function (handler) {
                            handler(fields);
                        });

                        self.getData();

                    }, function (err) {

                        $rootScope.$broadcast('notification', {
                            'type': 'error'
                            , 'message': 'web.backoffice.detail.optionsLoadingError'
                            , variables: {
                                errorMessage: err
                            }
                        });

                    });

            };


            /**
             * Register handlers that will be called when OPTIONS data is received
             * Is needed insteadd of $scope.$emit, as $scope causes problems if multiple detail-view directives
             * are present on one site.
             */
            self.registerOptionsDataHandler = function (handler) {
                optionHandlers.push(handler);
            };

            self.removeOptionsDataHandler = function (handler) {
                optionHandlers.splice(optionHandlers.indexOf(handler), 1);
            };


            /**
             * Makes options call, sets self.fields
             */
            self.makeOptionRequest = function (url) {

                /*return APIWrapperService
                    .request({
                        method: 'OPTIONS'
                        , url: url
                    })
                    .then(function (data) {
                        console.log('DetailView: Got OPTIONS data for %o %o', url, data);
                        self.fields = self.parseOptionData(data);
                        return self.fields;
                    }, function (err) {
                        return $q.reject(err);
                    });*/
                return boAPIWrapper
                        .getOptions(url)
                        .then(function (data) {
                            console.log('DetailView: Got OPTIONS data for %o %o', url, data);
                            self.fields = data;
                            return self.fields;
                        }, function (err) {
                            return $q.reject(err);
                        });
            };

            self.resolveAlias = function(spec){
                if(spec.hasAlias) return spec.name;
                return spec.modelName;
            };
            self.fieldTypeMapping = {
                  'string'  : 'text'
                , 'decimal' : 'number'
                , 'integer' : 'number'
                , 'boolean' : 'boolean'
                , 'json'    : 'json'
                , 'datetime' : 'datetime'
                , 'date'    : 'datetime'
            };

            //////////////////////////////////////////////////////////////////////////
            //
            // Register Components

            /**
             * For a autoFormElements to register themselves.
             * - Pushes them to registeredComponents
             * - As soon as all are registered, data is gotten (GET)
             * - Gotten data (GET) is distributed to registered components
             * - Registered components are asked for their data when saving
             * @param {Object} element        The child directive itself (this)
             */
            self.register = function (el) {
                self.registeredComponents.push(el);
            };

            //////////////////////////////////////////////////////////////////////////
            //
            // GET data

            self.getData = function () {
                // autoFormElementCount is only set on init, as element is not available before.
                // Register may happen before (as child elements are linked before parent elements).
                // Return.
                if (autoFormElementCount === 0) {
                    console.info('DetailViewController: No subcomponents components found!');
                    return;
                }

                // Only get data when all components have registered themselves.
                if (self.registeredComponents.length < autoFormElementCount) {
                    console.log('DetailViewController: Can\'t get data, not all autoFormElements registered yet: %o vs %o', self.registeredComponents.length, autoFormElementCount);
                    return;
                }

                // Too many components registered
                if (self.registeredComponents.length > autoFormElementCount) {
                    console.error('DetailViewController: More components registered than detected in the DOM: %o vs %o. Registered: %o.', self.registeredComponents.length, autoFormElementCount, self.registeredComponents);
                    // Data has already been gotten, therefore return.
                    return;
                }

                if (!self.getEntityId()) {
                    console.log('DetailViewController: Can\'t get data, entity ID is not set.');
                    return;
                }


                self
                    .makeGetRequest()
                    .then(function (data) {
                        self.data = data;
                        self.distributeData(data);
                    }, function (err) {
                        $rootScope.$broadcast('notification', {
                            type: 'error'
                            , message: 'web.backoffice.detail.loadingError'
                            , variables: {
                                errorMessage: err
                            }
                        });
                    });

            };


            /**
             * See @registerOptionDataHandler
             */
            self.registerGetDataHandler = function (handler) {
                getHandlers.push(handler);
            };


            /**
             * Goes through all registered components and sets
             * select fields that have to be sent to server (through header)
             * whenever a GET call is made. They are collected from the autoFormElement
             * directive
             */
            self.getSelectParameters = function () {

                var select = [];
                for (var i = 0; i < self.registeredComponents.length; i++) {

                    var comp = self.registeredComponents[i];

                    // New notation: getSelectFields
                    if (comp.getSelectFields && angular.isFunction(comp.getSelectFields)) {
                        select = select.concat(comp.getSelectFields());
                    }
                    // Old notation: select property
                    else if (comp.select) {
                        // Array (when multiple selects must be made)
                        // concat adds array or value
                        select = select.concat(comp.select);
                    }


                }

                console.log('DetailView %o: getSelectParameters returns %o', self.getEntityName(), select);

                return select;

            };


            // Whenever data is gotten from server (GET), distribute data to child components
            // and child controllers
            self.distributeData = function (data) {

                // $broadcast for child and parent Controllers (view-specific)
                //$scope.$broadcast( 'dataUpdate', { entity: self.getEntityName(), data: data } );
                $scope.$emit('dataUpdate', {entity: self.getEntityName(), data: data});

                // Call handlers for child components (auto-forml-elements);
                // can't use $broadcast as auito-form-elements need to have an isolated
                // scope for nexted detailViews
                getHandlers.forEach(function (handler) {
                    handler(data);
                });

            };


            /**
             * Get data for current entity from server, fire dateUpdate. Done after changes were saved.
             */
            self.updateData = function () {

                return self
                    .makeGetRequest()
                    .then(function (data) {

                        self.distributeData(data);
                        return data;

                    }, function (err) {
                        $rootScope.$broadcast('notification', {
                            type: 'error'
                            , message: 'web.backoffice.detail.saveError'
                            , variables: {
                                errorMessage: err
                            }
                        });
                        return $q.reject(err);
                    });
            };


            /**
             * Gets current entity's data through GET call
             */
            self.makeGetRequest = function () {

                var url = self.getEntityUrl()
                    , select = self.getSelectParameters();

                console.log('DetailView: Get Data from %o with select %o', url, select);

                return APIWrapperService.request({
                    url: url
                    , headers: {
                        select: select
                    }
                    , method: 'GET'
                })
                    .then(function (data) {

                        return data;

                    }.bind(this), function (err) {
                        return $q.reject(err);
                    });

            };


            ///////////////////////////////////////////////////////////////////////////////////////////////
            //
            // Save
            //

            /**
             * Called when user clicks 'save'. Can be called manually through scope().
             *
             * @param <Boolean> dontNotifyOrRedirect            If true, no notification is shown and on successful creation, user is
             *                                                _not_ redirected to the new entity. Needed for manual saving.
             * @returns <Integer>                            ID of the current entity
             */
            $scope.save = function (dontNotifyOrRedirect, ev, callback) {

                // Needed for nested detailViews: We don't want to propagate the save event to the parent detailView
                // See e.g. article in CC back office
                if (ev && angular.isFunction(ev.preventDefault)) {
                    ev.preventDefault();
                }

                // We need to get the saved entity's id so that we can redirect the user to it
                // after it has been created (when user was on /entity/new)
                // Can't be returned, as we're using promises. Therefore pass an object to the save
                // call that will be filled with the id
                /*var returnValue = {
                 id: undefined
                 };*/

                return self
                    .makeSaveRequest(self.registeredComponents, self.getEntityName())
                    .then(function (entityId) {

                        // Entity didn't have an ID (was newly created): Redirect to new entity
                        if (self.parseUrl().isNew && !dontNotifyOrRedirect) {
                            $state.go('app.detail', {entityName: self.getEntityName(), entityId: self.getEntityId()});
                        }

                        // Do notify and redirect
                        if (!dontNotifyOrRedirect) {
                            console.log('DetailViewController: Show success message on %o', $rootScope);
                            $rootScope.$broadcast('notification', {
                                type: 'success'
                                , message: 'web.backoffice.detail.saveSuccess'
                            });
                        }
                        else {
                            console.log('DetailViewController: Don\'t show any message or redirect');
                        }

                        self.updateData();

                        return entityId || null;


                    }, function (err) {

                        $rootScope.$broadcast('notification', {
                            type: 'error'
                            , message: 'web.backoffice.detail.saveError'
                            , variables: {
                                errorMessage: err.message
                            }
                        });

                        return $q.reject(err);

                    });

            };


            /**
             * Stores all component's data on server
             */
            self.makeSaveRequest = function () {

                // Check if all form elements are valid
                for (var i = 0; i < self.registeredComponents.length; i++) {
                    if (angular.isFunction(self.registeredComponents[i].isValid) && !self.registeredComponents[i].isValid()) {
                        return $q.reject(new Error('Not all required fields filled out.'));
                    }
                }

                // Pre-save tasks (upload images)
                return self.executePreSaveTasks()

                    // Save stuff on current entity
                    .then(function () {
                        return self.makeMainSaveCall();
                    })
                    .then(function () {
                        return self.executePostSaveTasks();
                    });

            };


            /**
             * Executes tasks that must be done before the current entity is saved, i.e.
             * create all entities that will be linked to this entity afterwards, like e.g.
             * upload an image
             * Calls beforeSaveTasks on registered components. They must return a promise.
             */
            self.executePreSaveTasks = function () {

                var tasks = [];

                for (var i = 0; i < self.registeredComponents.length; i++) {
                    var reg = self.registeredComponents[i];
                    if (reg.beforeSaveTasks && angular.isFunction(reg.beforeSaveTasks)) {
                        tasks.push(reg.beforeSaveTasks());
                    }
                }

                console.log('DetailView: executePreSaveTasks has %o tasks', tasks.length);

                return $q.all(tasks);

            };


            /**
             * Executes save tasks that must be executed after the main entity was created,
             * e.g. save the order of images in a mediaGroup:
             * 1. Save main entity (done through regular save call)
             * 2. Update media links (/mediumGroup/id/medium/id) (done through regular save call)
             * 3. Update order (GET all media from /mediumGroup, then set order on every single relation)
             */
            self.executePostSaveTasks = function () {

                var tasks = [];

                self.registeredComponents.forEach(function (component) {
                    if (component.afterSaveTasks && angular.isFunction(component.afterSaveTasks)) {
                        tasks.push(component.afterSaveTasks());
                    }
                });

                console.log('DetailView: executePostSaveTasks has %o tasks', tasks.length);

                return $q.all(tasks);

            };


            /**
             * Saves:
             * - first, the data on the entity (creates entity, if not yet done)
             *   by doing all calls going to /
             * - second, all other things (e.g. relations that need the entity to be
             *   existent)
             * @return Promise        Parameter passed is null or mainEntity's id
             */
            self.makeMainSaveCall = function () {

                var calls = self.generateSaveCalls();

                console.log('DetailView: Save calls are %o', calls);

                var mainCall
                    , relationCalls = []
                    , mainCallData;

                // Split calls up in mainCall, needs to be done first
                // (main entity needs to be created before relations can be set)
                // Main calls start with /entityName or /entityName/entityId (for updates)
                // /entityName/entityId must be covered in case of redirects. Subsequent calls
                // to releations must be made to the new entityId.
                for (var i = 0; i < calls.length; i++) {

                    // If url is an object it should never be a call to the mainEnity (as mainEntity: append or prepend will be
                    // used and therefore a relation be created.
                    if (
                        !angular.isObject(calls[i].url) &&
                        (
                            !calls[i].url ||
                            calls[i].url.indexOf('/' + self.getEntityName()) === 0
                        )
                    ) {
                        mainCall = calls[i];
                    }

                    else {
                        relationCalls.push(calls[i]);
                    }

                }

                // entityId not yet set: New element – but has no fields or no required fields,
                // therefore no information might be provided, except for some relations.
                // If entity is not generated (what would happen as there's no data to store),
                // relations could not be created (POST to /entityName/otherEntityName/otherEntityId)
                // would fail, as entityId doesn't exist.
                if (!mainCall && !self.getEntityId()) {
                    mainCall = {
                        method: 'POST'
                        , url: '/' + self.getEntityName()
                    };
                }

                console.log('DetailView: Main save call is %o, other calls are %o', mainCall, relationCalls);

                // Make main call
                return self.executeSaveRequest(mainCall)

                    // Make all secondary calls (to sub entities) simultaneously
                    .then(function (mainCallResult) {

                        // Make mainCallData available to next promise
                        mainCallData = mainCallResult;

                        console.log('DetailView: Made main save call; got back %o', mainCallData);

                        // Pass id of newly created object back to the Controller
                        // so that user can be redirected to new entity
                        if (mainCallData && mainCallData.id) {
                            $scope.entityId = mainCallData.id;
                        }

                        var callRequests = [];
                        relationCalls.forEach(function (call) {
                            callRequests.push(self.executeSaveRequest(call));
                        });

                        return $q.all(callRequests);

                    })

                    // Make sure we pass back the id.
                    .then(function () {
                        if (mainCallData && mainCallData.id) {
                            console.log('DetailView: Made call to the main entity; return it\'s id %o', mainCallData.id);
                            return mainCallData.id;
                        }
                        return null;
                    });


            };


            /**
             * Adds the call componentCall gotten from a registered component to the
             * calls variable that's sorted by urls and methods.
             * Therefore, if multiple calls to the same url exists, it groups them together
             * by an array item on calls and composes the data.
             */
            self.addCall = function (componentCall, calls) {

                // Components may pass back just a data field – means that it's stored on the entity itself.
                // Get url from self.getEntityUrl, as it is needed to determine the method of the call
                // (PATCH or POST).
                if (!componentCall.url) {
                    componentCall.url = self.getEntityUrl();
                }


                // Method's missing
                if (!componentCall.method) {

                    // Test if URL has an ID (ends with /12329)
                    // If it does, use patch, else post.
                    if (/\/\d*\/?$/.test(componentCall.url)) {
                        componentCall.method = 'PATCH';
                    }
                    else {
                        componentCall.method = 'POST';
                    }
                }

                // Check if call to url does already exit
                var call = this.getSaveCall(calls, componentCall.method, componentCall.url);

                // If componentCall has headers, treat it as a different call. To improve, we might
                // compare headers, but let's save that for better times.
                // Headers are e.g. used in treeFormData to store a tree (needs Content-Type: application/json)
                if (componentCall.hasOwnProperty('headers')) {
                    call = false;
                }

                // Call doesn't yet exist
                if (!call) {
                    call = {
                        method: componentCall.method
                        , url: componentCall.url
                        , data: componentCall.data
                        , headers: componentCall.headers || {}
                    };
                    calls.push(call);
                }

                // Add data
                else {

                    // Don't do that if we're sending a string or array (e.g. when using application/json as Content-Type
                    if (componentCall.data) {
                        for (var p in componentCall.data) {
                            call.data[p] = componentCall.data[p];
                        }
                    }

                }

            };


            /**
             * Check if a call to method and url does already exist in calls. If it does, return it,
             * else return false
             * @param <Array> calls            Array of calls
             * @pparam <String> method
             * @param <String> url
             */
            self.getSaveCall = function (calls, method, url) {

                // Default: empty array, if not found
                var saveCall = false;
                calls.some(function (call) {
                    // Check if URL is the same. Normally use === comparator.
                    // But if URL is not set, it might be false or '', therefore
                    // use == comparator.
                    var sameUrl = call.url === url || ( !call.url && !url )
                        , sameMethod = call.method.toLowerCase() === method.toLowerCase();
                    if (sameMethod && sameUrl) {
                        saveCall = call;
                        return true;
                    }
                });
                return saveCall;

            };


            /**
             * Makes POST or PATCH call to server to store data.
             * @param <Object> data            Key: URL to be called
             *                                Value: Data to be sent
             * @param <String> basePath        The current entity's path (e.g. /event/18),
             *                                needed to generate calls to relative URLs
             * @return <Promise>                Promise of the corresponding call
             */
            self.executeSaveRequest = function (call) {

                // Empty call (if there's no call to / to be made, e.g.)
                // Just resolve the promise
                if (!call) {
                    console.log('DetailView: No call to be made');
                    var deferred = $q.defer();
                    deferred.resolve();
                    return deferred.promise;
                }

                // url
                // - Take current url + url, if it's relative (doesn't start with a /)
                // - Take url if it's absolute (starts with a /)
                var url;


                //
                // Generate final URL
                //


                // Object

                if (angular.isObject(call.url)) {

                    // url.path missing – needs to be set if url is an object
                    if (!call.url.path) {
                        console.error('DetailViewController: url property is missing on path on %o', call);
                        return $q.reject('Got invalid call data, path property missing on url for ' + JSON.stringify(call));
                    }

                    // entityName/entityId or entityName
                    var mainEntityUrl = self.getEntityId() ?
                    self.getEntityName() + '/' + self.getEntityId() :
                        self.getEntityName();

                    // Remove trailing and leading slashes
                    var path = call.url.path.replace(/^\/*/, '').replace(/\/*$/, '');

                    if (call.url.mainEntity === 'prepend') {

                        url = '/' + mainEntityUrl + '/' + path;

                    }
                    else if (call.url.mainEntity === 'append') {

                        url = '/' + path + '/' + mainEntityUrl;

                    }

                    else {
                        url = call.url.path;
                    }

                }



                // URL starts with /

                else if (call.url && call.url.indexOf('/') === 0) {

                    url = call.url;

                }


                // Relative URL

                else {

                    url = '/' + self.getEntityName();

                    // Only use entity's ID if it exists (i.e. we're not newly creating an entity)
                    if (self.getEntityId()) {
                        url += '/' + self.getEntityId();
                    }

                    // Append call.url, if available
                    if (call.url) {
                        url += '/' + call.url;
                    }

                }

                console.log('DetailView: Make %s call to %s with %o. Call is %o, entityName is %o.', call.method, url, call.data, call, self.getEntityName());

                // Add datasourceId as long as it's needed
                // #todo remove when eE's ready
                if (!call.data) {
                    call.data = {};
                }

                return APIWrapperService.request({
                    url: url
                    , data: call.data
                    , method: call.method
                    , headers: call.headers
                });

            };


            /**
             * Goes through all inputs, collects their save calls (by calling getSaveCalls)
             *
             * getSaveCalls() may return:
             * - false (no call to be made)
             * - an array of objects or single object, where each object has the following properties
             *     - url (mandatory): URL to be called as
             *           - a <String>: If prefixed with a /, will be an absolute path, else relative to the
             *             current entity
             *           - an <Object> with the properties
             *                   - path <String>: path
             *                   - baseEntity <String> 'append|prepend' Whether and where to append
             *                     the current entity plus its ID. If not set or another value,
             *                     current entity is not used at all.
             *     - method (mandatory, <String>): method to be used (GET,PATCH,POST)
             *     - headers (optional, <Object>): an object of headers, e.g. { range: '0-10' }
             *     - data (optional <Object>): data to be sent with a POST or PATCH request
             * - a Promise
             */
            self.generateSaveCalls = function () {

                // Holds all calls to be made:
                // [ {
                //		url			: '/city'
                //		method		: 'POST|PUT|PATCH'
                //		data		: {} // Data to be stored on url/method
                // } ]
                var calls = [];
                console.log('DetailView: Generate calls for %o registered components', self.registeredComponents.length);

                for (var i = 0; i < self.registeredComponents.length; i++) {

                    var comp = self.registeredComponents[i];

                    if (!comp.getSaveCalls || !angular.isFunction(comp.getSaveCalls)) {
                        console.error('DetailView: Missing getSaveCalls on component %o', comp[i]);
                        continue;
                    }

                    //console.log( 'DetailView: generateSaveCalls for %o', this.registered[ i ] );
                    var componentCalls = comp.getSaveCalls();

                    // Component has to return false if there's nothing to save
                    if (componentCalls === false) {
                        console.log('DetailView: No save calls for %o', comp);
                        continue;
                    }

                    // Make array out of a componentCall
                    if (!angular.isArray(componentCalls)) {
                        componentCalls = [componentCalls];
                    }

                    console.log('DetailView: componentCalls are %o for %o', componentCalls, comp);
                    componentCalls.forEach(function (componentCall) {
                        self.addCall(componentCall, calls);
                    });

                }

                console.log('DetailView: calls are %o', calls);
                return calls;

            };


            ///////////////////////////////////////////////////////////////////////////////////////////////
            //
            // DELETE
            //

            /**
             * Deletes the entity.
             * @todo: the redirection should not be a matter of the detail-view itself, if we have nested detail
             * @param <Boolean> nonInteractive        True if user should not be redirected to main view
             */
            $scope.delete = function (nonInteractive) {

                console.log('DetailView: Delete');

                // Display confirmation dialog – must be done in interactive and non-interactive mode
                var confirmed = confirm($filter('translate')('web.backoffice.detail.confirmDeletion'));

                if (!confirmed) {
                    return;
                }

                return self
                    .makeDeleteRequest()
                    .then(function (data) {

                        // Go to entity's list view
                        if (!nonInteractive) {

                            $state.go('app.list', {entityName: self.getEntityName()});

                            $rootScope.$broadcast('notification', {
                                type: 'success'
                                , message: 'web.backoffice.detail.deleteSuccess'
                            });

                        }

                        // Resolve promise
                        return true;

                    }, function (err) {

                        if (!nonInteractive) {
                            $rootScope.$broadcast('notification', {
                                type: 'error'
                                , message: 'web.backoffice.detail.deleteError'
                                , variables: {
                                    errorMessage: err
                                }
                            });
                        }

                        return $q.reject(err);

                    });

            };


            /**
             * Delete an entity
             */
            self.makeDeleteRequest = function () {

                console.log('DetailView: Make DELETE request');

                return APIWrapperService.request({
                    url: '/' + self.getEntityName() + '/' + self.getEntityId()
                    , method: 'DELETE'
                });
            };


        }]);
})();
/**
* Loads detail view template and controller that correspond to the current URL
* Then compiles them into the current element
* Loaded in $routeProvider
*/
angular
.module( 'jb.backofficeDetailView' )
.controller( 'DetailViewLoaderController', [ '$scope', '$location', '$http', '$q', '$compile', function( $scope, $location, $http, $q, $compile ) {


	var self = this;


	// Get entity & id from path
	var path			= $location.path()
		, pathParts		= path.split( '/' );

	// Path missing
	if( !pathParts.length ) {
		alert( 'no path provided' );
		return;
	}

	var entityName		= pathParts[ 1 ]
		, entityId		= pathParts[ 2 ];

	console.log( 'DetailViewLoader: entity name is %o, id %o', entityName, entityId );



	/**
	* Generate controller's name and template URL from current url
	*/
	self.getControllerAndTemplate = function( entityName, entityId ) {
		
		// EntityName is missing
		if( !entityName ) {
			return false;
		}

		// camel-case instead of camelCase
		var entityDashed		= entityName.replace( /[A-Z]/g, function( match ) { return '-' + match.toLowerCase(); } )
			, templateBasePath	= 'src/app/' + entityDashed + '/'
			, templatePath
			, controllerName;

		// List
		if( !entityId ) {
			controllerName	= 'backoffice' + entityName.substring( 0, 1 ).toUpperCase() + entityName.substring( 1 ) + 'ListController';
			templatePath	= templateBasePath + entityDashed + '-list.tpl.html';
		}


		// New or Edit (same template)
		else if( entityId ==='new' || !isNaN( parseInt( entityId, 10 ) ) ) {
			templatePath	= templateBasePath + entityDashed + '-detail.tpl.html';
		}

		// Id is not 'new' nor a number
		else {
			console.error( 'unknown entity id: %o', entityId );
		}

		return {
			controllerName		: controllerName
			, templateUrl		: templatePath
		};

	};


	/**
	* Gets template from server, returns promise
	*/
	self.getTemplate = function( templateUrl ) {
		return $http( { method: 'GET', url: templateUrl,  headers: { 'accept': 'text/html' } } )
			.then( function( data ) {
				console.log( 'DetailViewLoader: got template %o', data );
				return data.data;
			}, function( err ) {
				return $q.reject( err );
			} );
	};


	/**
	* Attachs template and controller to [ng-view], renders it 
	*/
	self.renderTemplate = function( template, controllerName) {
		
		var ngView		= $( '[ng-view], [data-ng-view]' );

		// Create parent that holds controller
		var parent		= $( '<div></div>' );
		if( controllerName ) {
			parent.attr( 'data-ng-controller', controllerName );
		}
		parent.html( template );

		console.log( 'DetailViewLoader: render Template %o with controller %o', parent, controllerName );

		ngView
			.empty()
			.append( parent );

		$compile( parent )( $scope );

	};




	/**
	* Gets the template and controller to be rendered, and does so.
	*/
	self.init = function() {
	
		var controllerAndTemplate = self.getControllerAndTemplate( entityName, entityId );

		// Entity was not available, getControllerAndTemplate returned false.
		if( !controllerAndTemplate ) {
			self.renderTemplate( '404 – Page could not be found', false );
			return;
		}


		// Everything fine
		var templateUrl			= controllerAndTemplate.templateUrl
			, controllerName	= controllerAndTemplate.controllerName;

		self.getTemplate( templateUrl )
			.then( function( data ) {
				self.renderTemplate( data, controllerName );
			}, function( err ) {

				var ngView		= $( '[ng-view], [data-ng-view]' );
				ngView.text( 'Template ' + templateUrl + ' not found. Entity can\'t be edited' );

			} );

	};


	self.init();




} ] );
/**
* Hidden input. Used to 
* - add select statements to detailView (use for attribute)
* - store hidden fields in detailView
* 
* Pass 
* - data-read="expression" to only read data if a certain condition is met or
* - data-write="expression" to only write data if a certain condition is met
* Default for both (if not passed) is true. Evals against $scope.$parent.
*/

'use strict';


angular
.module( 'jb.backofficeHiddenInput', [] )

/**
* Directive for an autoFormElement of type 'text'
*/
.directive( 'hiddenInput', [ function() {

	return {
		require			: [ 'hiddenInput', '^detailView' ]
		, controller	: 'HiddenInputController'
		, link			: function( scope, element, attrs, ctrl) {
			ctrl[ 0 ].init( element, ctrl[ 1 ] );
		}
		// Let the user get stuff from the $parent scope to use 
		// as value
		, scope			: true
	};

} ] )

.controller( 'HiddenInputController', [ '$scope', '$attrs', function( $scope, $attrs ) {

	var self			= this
		, element
		, detailViewController;

	self.init = function( el, detViewCtrl ) {

		element = el;
		detailViewController = detViewCtrl;

		// Register myself at detailViewController
		detailViewController.register( self );

	};

	self.isValid = function() {

		return true;
	};


	// Purpose 1: let user select any field passed through for
	// If the elemen's data-read attribute evals to false, don't add the for
	// attribute to the select statement. 
	// This is e.g required for nested sets where we need to *set* «parentNode» or «after» or «before»,
	// but can't select those properties because they're virtual.	
	console.log( 'HiddenInput: for is %o, read %o (hasProperty %o) evals to %o', $attrs.for, $attrs.read, $attrs.hasOwnProperty( 'read' ), $scope.$parent.$eval( $attrs.read ) );
	if( !$attrs.hasOwnProperty( 'read' ) || $scope.$parent.$eval( $attrs.read ) ) {
		self.select = $attrs.for;
	}


	// Purpose 2: Store hidden values
	self.getSaveCalls = function() {

		var writeData = !$attrs.hasOwnProperty( 'write' ) || $scope.$parent.$eval( $attrs.write );

		console.log( 'HiddenInput: Get save calls; $attrs.data is %o, writeData is %o, data-write is %o and evals to %o', $attrs.data, writeData, $attrs.write, $scope.$parent.$eval( $attrs.write ) );

		if( writeData && $attrs.data ) {

			var isRelation = $attrs.for && $attrs.for.indexOf( '.' ) > -1;

			// If there's a star in the for attribute, we're working with a relation. 
			// Store it through POSTing to /entity/id/entity/id instead of sending data.
			// If you should ever change this behaviour, make sure that you can still edit
			// discounts on articles in the Cornèrcard back office. 
			if( isRelation ) {

				var entityName 		= $attrs.for.substring( 0, $attrs.for.lastIndexOf( '.' ) )
					, url			= entityName + '/' + $attrs.data;

				console.log( 'HiddenInput: Store relation %o', url );

				return {
					url			: url
					, method	: 'POST'
				};


			}
			else {

				// Compose data
				var saveData = {};
				saveData[ $attrs.for ] = $attrs.data;

				console.log( 'HiddenInput: Store data %o', saveData );

				return {
					url			: ''
					, data		: saveData
					// Method: PATCH if entity already has an ID, else POST
					, method	: detailViewController.getEntityId() ? 'PATCH' : 'POST'
				};

			}

		}

		return false;

	};


} ] );
/**
* Angular directive that accepts file drops:
* - Adds the file to the model
* - Adds classes .drop-over, .dropped (2s)
* - Holds a (hidden) file upload button
*/

angular
.module( 'jb.fileDropComponent', [] )
.directive( 'fileDropComponent', [ function() {

	return {
		require				: [ 'fileDropComponent' ]
		, controller		: 'FileDropComponentController'
		, controllerAs		: 'fileDropComponent'
		, bindToController	: true
		, link				: function( scope, element, attrs, ctrl ) {
			ctrl[ 0 ].init( element );
		}
		, scope: {
			'supportedFileTypes'			: '='
			// Array the file data is pushed to
			, 'files'						: '=model'
			// Function that handles errors. Is called with 
			// an Error object. The argument passed must be called
			// «error»: 
			// data-error-handler="errorFn(error)"
			, 'errorHandler'				: '&'
			, 'maxFileCount'				: '@' // To be implemented.
		}
	};

} ] )

.controller( 'FileDropComponentController', [ '$scope', function( $scope ) {

	var self = this
		, _element;

	self.files = [];

	// undefined
	// hover
	// dropped
	self.state = 'undefined';


	self.init = function( el, detailViewCtrl ) {

		_element = el;
		_setupDragDropListeners();

		_addFileInputChangeListener();

	};




	/////////////////////////////////////////////////////////////////////////////////
	//
	// ERROR HANDLER
	//

	/**
	* Call the error-handler function with an error.
	*/
	function _throwError( err ) {

		if( self.errorHandler && angular.isFunction( self.errorHandler ) ) {
			self.errorHandler( { error: err } );
		}

	}



	/////////////////////////////////////////////////////////////////////////////////
	//
	// HTML5 d'n'd Stuff
	//
	
	function _setupDragDropListeners() {

		_element
			.bind( 'drop', _dropHandler )
			.bind( 'dragover', _dragOverHandler )
			.bind( 'dragenter', _dragOverHandler )
			.bind( 'dragleave', _dragLeaveHandler );

	}

	function _dragOverHandler( ev ) {
		ev.preventDefault();
		// Doesn't work yet. Probably needs a shared scope as we're 
		// using it in nested directives.
		/*$scope.$apply( function() {
			self.state = 'hover';
		} );*/
		ev.originalEvent.dataTransfer.effectAllowed = 'copy';
		return false;
	}


	function _dropHandler( ev ) {
		ev.preventDefault();
		var files = ev.originalEvent.dataTransfer.files;
		_handleFiles( files );
		return false;
	}


	function _dragLeaveHandler( ev ) {
		/*$scope.$apply( function() {
			self.state = undefined;
		} );*/
	}





	/////////////////////////////////////////////////////////////////////////////////
	//
	// INPUT[type=file] STUFF
	//


	/**
	* If there's an input[type=file], handle it's change event.
	*/
	function _addFileInputChangeListener() {

		_element
			.find( 'input[type=\'file\']' )
			.change( function( ev ) {

				if( !ev.target.files || !ev.target.files.length ) {
					console.log( 'BackofficeImageComponentController: files field on ev.target missing: %o', ev.target );
					return;
				}

				_handleFiles( ev.target.files );

			} );

	}





	/////////////////////////////////////////////////////////////////////////////////
	//
	// HTML5 FILE stuff
	//

	/**
	* Handles files in a JS fileList
	*/
	function _handleFiles( files ) {

		var invalidFiles = [];

		// files is not an array, cannot use forEach
		for( var i = 0; i < files.length; i++ ) {

			var file = files[ i ];

			if( _checkFileType( file ) ) {
				_readFile( file );
			}
			else {
				invalidFiles.push( file.name );
			}

		}

		// Inalid files detected: 
		// - console.warn
		// - call error callback function with new error
		if( invalidFiles.length ) {
			console.warn( 'FileDropComponentController: Invalid file ', JSON.stringify( invalidFiles ) );
			_throwError( new Error( 'Tried to upload files with invalid file type: ' + invalidFiles.join( ', ' ) + '. Allowed are ' + self.supportedFileTypes.join( ', ' ) ) + '.' );
		}

	}



	/**
	* Check if file type of dropped file is in self.supportedFileTypes.
	*/
	function _checkFileType( file ) {

		if( !self.supportedFileTypes || !angular.isArray( self.supportedFileTypes ) ) {
			return true;
		}

		return self.supportedFileTypes.indexOf( file.type ) > -1;

	}



	/**
	* Read file, add to self.files.
	*/
	function _readFile( file ) {

		var fileReader = new FileReader();

		// Add file data to self.files on load
		fileReader.onload = function( loadEv ) {


			var imageSize
				, fileData = {
					file		: file
					, fileSize	: file.size
					, mimeType	: file.type
					, height	: undefined
					, width		: undefined
					, fileData 	: loadEv.target.result
			};



			// Try to get dimensions if it's an image
			try {

				var image = new Image();
				image.src = fileReader.result;
				image.onload = function() {

					var imageScope = this;

					$scope.$apply( function() {
						fileData.width = imageScope.width;
						fileData.height = imageScope.height;
					} );

				};

			}
			catch( e ) {
				console.error( 'FileDropComponentController: Error reading file: %o', e );
			}


			// Read file ( to display preview)
			$scope.$apply( function() {

				self.files.push( fileData );
	
			} );

		};

		fileReader.readAsDataURL( file );

	}





} ] );
/**
* Directive for locales
*/

( function() {

	'use strict';


	angular
	.module( 'jb.localeComponent', [ 'jb.apiWrapper', 'jb.backofficeShared' ] )
	.directive( 'localeComponent', [ function() {

		return {
			link				: function( scope, element, attrs, ctrl ) {
				ctrl.init(element);
			}
			, controller		: 'LocaleComponentController'
			, templateUrl		: 'localeComponentTemplate.html'
			, scope				: {
				  fields		: '='
				, model			: '='
				, entityName	: '=' // For translation
				, tableName		: '='
				// Sets validity of the component on the parent scope
				, setValidity	: '&'
			}
		};

	} ] )

	.controller( 'LocaleComponentController', [
              '$scope'
            , 'APIWrapperService'
            , 'backofficeFormEvents'
            , function( $scope, APIWrapperService, formEvents ) {

		var   self = this
			, element;

        this.formEvents = formEvents;

		// [
		// 	{
		//		id		: 1 ,
		//		code	: 'de'
		//	}
		// ]
		$scope.languages			= [];
		

		/**
		* Array with languageIds that were selected to be edited (multiselect)
		*/ 
		$scope.selectedLanguages	= undefined;


		/**
		* Contains every field and it's definition, e.g. 
		* {
		*	name			: fieldName (taken from $scope.fields)
		* 	required		: true
		* }
		*/ 
		$scope.fieldDefinitions		= [];



		self.init = function( el, mCtrl ) {
			element = el;

			// Adjust height of textareas
            //@todo: update this as soon as we receive data
			setTimeout( function() {
				self.adjustHeightOfAllAreas();
			}, 1000 );

			self.setupFieldDefinitionWatcher();
			self.setupValidityWatcher();
			self.setupSelectedLanguagesWatcher();
			$scope.$emit(formEvents.registerComponents, self);
		};







		self.setupSelectedLanguagesWatcher = function() {
			$scope.$watch( 'selectedLanguages', function( newValue ) {

				// newValue available? Return if length is 0 to not divide by 0
				if( !newValue || !angular.isArray( newValue ) || newValue.length === 0 ) {
					return;
				}

				var colWidth = Math.floor( 100 / newValue.length  ) + '%';
				element.find( '.locale-col' ).css( 'width', colWidth );

				setTimeout( function() {
					self.adjustHeightOfAllAreas();
				} );

			}, true );
		};


		/**
		* Watches model for changes and updates validity on *parent scope‹ if
		* function was passed. Therefore tells if the whole component is valid or not (and 
		* not just a single field).
		* If at least one field (required or not) was set, all required fields must be set.
		*/
		self.setupValidityWatcher = function() {
			$scope.$watch( 'model', function( newVal ) {
				
				if( !$scope.setValidity || !angular.isFunction( $scope.setValidity ) ) {
					return;
				}

				// If model is not an object, there's no value missing.
				if( !angular.isObject( newVal ) || !Object.keys( newVal ) ) {
					$scope.setValidity( {validity: true } );
					return;
				}


				var requiredFields		= self.getRequiredFields()
					, valid				= true;


				// Go through all objects. Check if required properties are set.
				Object.keys( newVal ).forEach( function( languageKey ) {

					var languageData		= newVal[ languageKey ]
						, usedFields		= Object.keys( languageData );

					console.log( 'LocaleComponentController: used fields %o, required %o in %o', usedFields, requiredFields, languageData );

					requiredFields.some( function( reqField ) {
						if( usedFields.indexOf( reqField ) === -1 ) {
							valid = false;
							console.log( 'LocaleComponentController: Required field %o missing in %o', reqField, languageData );
						}
					} );

				} );

				$scope.setValidity( { validity: valid } );

			}, true );
		};




		/**
		* Checks if a certain field is valid. 
		*/
		self.isFieldValid = function( languageId, fieldName ) {

			var requiredFields		= self.getRequiredFields()
				, languageData		= $scope.model[ languageId ];

			// No value was set for the language: All it's fields are valid.
			// Not an object: Invalid, don't care.
			if( !languageData || !angular.isObject( languageData ) ) {
				return true;
			}

			// Field is not required.
			if( requiredFields.indexOf( fieldName ) === -1 ) {
				return true;
			}

			// Not valid: Data is set for this language (i.e. some keys exist)
			// but current fieldName was not set. 
			// ATTENTION: '' counts as a set value (empty string).
			if( !languageData[ fieldName ] && languageData[ fieldName ] !== '' ) {
				return false;
			}

			return true;

		};



		/**
		* Checks if a certain field in a certain language is valid. Needed to 
		* set .invalid class on the label.
		*/
		$scope.isFieldValid = function( languageId, fieldName ) {
			return self.isFieldValid( languageId, fieldName );
		};





		/**
		* Returns an array of the required fields
		*/
		self.getRequiredFields = function() {
			var requiredFields = [];
			$scope.fieldDefinitions.forEach( function( fieldDef ) {
				if( fieldDef.required ) {
					requiredFields.push( fieldDef.name );
				}
			} );
			return requiredFields;
		};



		///////////////////////////////////////////////////////////////////////////////////////////////////////////
		//
		//   HEIGHT
		//


		/**
		* Adjusts height of textareas (functionality's very basic. very.)
		*/
		$scope.adjustHeight = function( ev ) {
			self.adjustHeight( $( ev.currentTarget ) );
		};


		self.adjustHeightOfAllAreas = function() {
			element.find( 'textarea' ).each( function() {
				self.adjustHeight( $( this ) );
			} );
		};




		self.adjustHeight = function( element ) {

			var textarea = element;

			var copy			= $( document.createElement( 'div' ) )
				, properties	= [ 'font-size', 'font-family', 'font-weight', 'lineHeight', 'width', 'padding-top', 'padding-left', 'padding-right' ];

			properties.forEach( function( prop ) {
				copy.css( prop, textarea.css( prop ) );
			} );

			copy
				.css( 'position', 'relative' )
				.css( 'top', '-10000px' )
				.text( textarea.val() )
				.appendTo( 'body' );

			var h = Math.min( copy.height(), 200 );

			copy.remove();

			// #TODO: Update height of all textareas to the highest one. 
			textarea.height( Math.max( h, parseInt( textarea.css( 'lineHeight'), 10 ) ) );

		};





		///////////////////////////////////////////////////////////////////////////////////////////////////////////
		//
		//   UI Stuff
		//


		$scope.isSelected = function( language ) {
			return $scope.selectedLanguages.indexOf( language ) > -1;
		};



		/**
		* Returns true if a certain language has at least one translation
		*/
		$scope.hasTranslation = function( langId ) {
			
			if( !$scope.model[ langId ] ) {
				return false;
			}

			var propertyCount = 0;
			for( var i in $scope.model[ langId ] ) {
				if( $scope.model[ langId ][ i ] ) {
					propertyCount++;
				}
			}

			return propertyCount > 0;

		};



		/**
		* Watches $scope.tableName and $scope.fields. Calls getFieldDefinitions.
		*/
		self.setupFieldDefinitionWatcher = function() {

			$scope.$watchGroup( [ 'tableName', 'fields' ], function() {
				self.getFieldDefinitions();
			} );

		};


		/** 
		* Gets definitions for fields
		*/
		self.getFieldDefinitions = function() {

			if( !$scope.fields || !$scope.tableName ) {
				console.log( 'LocaleComponentController: fields or tableName not yet ready' );
				return;
			}

			APIWrapperService.request( {
				url				: '/' + $scope.tableName
				, method		: 'OPTIONS'
			} )
			.then( function( data ) {
				self.parseOptionData( data );
			}, function( err ) {
				console.error( 'LocaleComponentController: Could not get OPTION data for table %o: %o', $scope.tableName, err );
			} );

		};


		/**
		* Parses data gotten from OPTIONS call. Goes through OPTIONS data for every field and 
		* sets fieldDefinitions accoringly.
		*/
		self.parseOptionData = function( data ) {

			console.log( 'LocaleComponentController: Parse OPTIONS data %o', data );

			// Reset fieldDefinitions
			$scope.fieldDefinitions = [];

			$scope.fields.forEach( function( field ) {

				$scope.fieldDefinitions.push( {
					name			: field
					, required		: !data[ field ].nullable
					, valid			: true
				} );

			} );

		};




	} ] )

	.run( function( $templateCache ) {

		$templateCache.put( 'localeComponentTemplate.html',
			'<div class=\'locale-component\'>' +
				'<div data-language-menu-component data-selected-languages=\'selectedLanguages\' data-is-multi-select=\'true\' data-has-translation=\'hasTranslation(languageId)\'></div>' +
				'<div class=\'locale-content clearfix\'>' +
					'<div class=\'locale-col\' data-ng-repeat=\'lang in selectedLanguages\'>' +
						'<p>{{ lang.code | uppercase }}</p>' +
						'<div data-ng-repeat=\'fieldDefinition in fieldDefinitions\'>' +

							'<label data-ng-attr-for=\'locale-{{lang.id}}-{{fielDefinition.name}}\' data-ng-class=\'{ "invalid": !isFieldValid(lang.id, fieldDefinition.name)}\'>' + 
								// Required asterisk
								'<span data-translate=\'web.backoffice.{{entityName}}.{{fieldDefinition.name}}\' ></span> <span class=\'required-indicator\'data-ng-show=\'fieldDefinition.required\'>*</span>' +
							'</label>' +
							'<textarea data-ng-model=\'model[ lang.id ][ fieldDefinition.name ]\' data-ng-attr-id=\'locale-{{lang.id}}-{{fieldDefinition.name}}\' class=\'form-control\' data-ng-keyup=\'adjustHeight( $event )\' data-ng-focus=\'adjustHeight( $event )\' /></textarea>' +

						'</div>' +
					'</div>' +
				'</div>' +
			'</div>'
		);

	} );

} )();


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

( function() {

	'use strict';

	angular

	.module( 'jb.backofficeShared', [] )

	.directive( 'dragDropList', [ function() {

		return {
				link					: function( $scope, element, attrs, ctrl ) {
						
					var dragDropPlugin;



					// Watch for additions to the DOM. On addition, re-initialize the drag and drop plugin. 
					// Needed if we have e.g. a list that's populated through ng-repeat: it's filled
					// with lis _after_ this function is invoked.
					var observer = new MutationObserver( function( mutations ) {
						
						var elementsAdded = 0;
						[].forEach.call( mutations, function( mutation ) {
							if( mutation.addedNodes && mutation.addedNodes.length ) {
								elementsAdded += mutation.addedNodes.length;
							}
						} );

						if( elementsAdded > 0 ) {
							dragDropPlugin.destroy();
							dragDropPlugin = new DragDropList( element[ 0 ].querySelectorAll( '[draggable="true"]' ) );
						}

					} );

					observer.observe( element[ 0 ], {
						childList: true
					} );

					$scope.$on( '$destroy', function() {
						observer.disconnect();
					} );



					// Initilaize drag and drop plugin
					dragDropPlugin = new DragDropList( element[ 0 ].querySelectorAll( '[draggable="true"]' ) );



				}
				, scope: {
				}
			};


	} ] );



	var DragDropList;

	// Hide stuff
	( function() {
	
		var _elements
			, _currentDragElement;


		DragDropList = function( elements ) {

			_elements = elements;

			console.log( 'DragDropList: Initialize for elements %o', elements );

			[].forEach.call( elements, function( element ) {
			
				element.setAttribute( 'draggable', true );
				addHandlers( element );

			} );

		};

		DragDropList.prototype.destroy = function() {

			console.log( 'DragDropList: Destroy event handlers on %o elements', _elements.length );

			[].forEach.call( _elements, function( element ) {
				removeHandlers( element );
			} );

		};


		function removeHandlers( element ) {
			
			element.removeEventListener( 'dragstart', dragStartHandler );
		
		}

		function addHandlers( element ) {

			element.addEventListener( 'dragstart', dragStartHandler );
			element.addEventListener( 'dragenter', dragEnterHandler );
			element.addEventListener( 'dragover', dragOverHandler );
			element.addEventListener( 'dragleave', dragLeaveHandler );
			element.addEventListener( 'drop', dropHandler );
			element.addEventListener( 'dragend', dragEndHandler );

		}

		function dragStartHandler( ev ) {

			// Use currentTarget instead of target: target my be a child element.
			ev.currentTarget.style.opacity = '0.4';
			_currentDragElement = ev.currentTarget;
			ev.dataTransfer.effectAllowed = 'move';
			ev.dataTransfer.setData( 'text/html', ev.currentTarget.outerHTML );

		}


		function dragEnterHandler( ev ) {
			ev.target.classList.add( 'drag-over' );
		}

		function dragLeaveHandler( ev ) {
			ev.target.classList.remove( 'drag-over' );
		}


		function dragOverHandler( ev ) {
			
			if ( ev.preventDefault ) {
					ev.preventDefault();
			}
			ev.dataTransfer.dropEffect = 'move';
			return false;

		}


		function dropHandler( ev ) {

			if (ev.stopPropagation) {
				ev.stopPropagation();
			}

			var oldOrder = getElementIndex( _currentDragElement );

			if ( _currentDragElement !== ev.currentTarget ) {

				console.log( 'dragDropList: Drop: %o after %o', _currentDragElement, ev.currentTarget );
				angular.element( ev.currentTarget ).after( _currentDragElement );

				// Dispatch orderChange event on li
				// Necessary to change the order on a possible parent directive
				var orderChangeEvent = new CustomEvent( 'orderChange', { 
					bubbles			: true
					, detail		:{	
						oldOrder	: oldOrder
						, newOrder	: getElementIndex( ev.currentTarget ) + 1
					}
				} );
				ev.currentTarget.dispatchEvent( orderChangeEvent );
			
			}

			return false;

		}


		/**
		* Returns the index (position) of an element within its parent element. 
		* @param <String> selector: Only respect sibling elements of element that match the selector (TBD)
		*/
		function getElementIndex( element ) {
			var siblings	= element.parentNode.childNodes
				, index		= 0;
			for( var i = 0; i < siblings.length; i++ ) {
				if( element === siblings[ i ] ) {
					return index;
				}
				if( siblings[ i ].nodeType === 1 ) {
					index++;
				}
			}
			return -1;
		}


		function dragEndHandler( ev ) {

			_currentDragElement.style.opacity = '1';
			_currentDragElement = undefined;
			// Make sure all .drag-over classes are removed
			[].forEach.call( _elements, function( element ) {
				element.classList.remove( 'drag-over' );
			} );

		}


	} )();



} )();


(function(){
    "use strict";
    var mod = angular.module('jb.getQuery', []);
    function GetQuery(){

    }

    function QueryEndpoint(){
        this.select = function(fields){

        }.bind(this);
    }

    /**
     * query.get(entity)        -> the first time this is invoked the query is bound to the endpoint
     * query.select(this.name)  -> returns the query
     * query.select([])         ->
     * query.subselect(this.entityName) -> returns a new query builder with a new entry point
     */
})();
/**
* Displays a menu with the supported languages.
*
* Use like
* <div data-language-menu-component
* 	data-selected="property" <!-- is always an array consisting of objects returned by self.getLanguage() -->
*	data-is-multi-select="false|true"
*	data-has-translation="functionName"> <!-- must take a paramter languageId, e.g. DE -->
* </div>
*
*/

( function() {

	'use strict';


	angular

	.module( 'jb.backofficeShared' )

	.directive( 'languageMenuComponent', [ function() {

		return {
			require					: [ 'languageMenuComponent' ]
			, controller			: 'LanguageMenuComponentController'
			, controllerAs			: 'languageMenuComponent'
			, bindToController		: true
			, templateUrl			: 'languageMenuComponentTemplate.html'
			, link					: function( scope, element, attrs, ctrl ) {
				ctrl[ 0 ].init( element );
			}
			, scope: {
				'selectedLanguages'	: '='
				, 'isMultiSelect'	: '='
				, 'hasTranslation'	: '&'
			}
		};

	} ] )

	.controller( 'LanguageMenuComponentController', [ 'SessionService', function( SessionService ) {

		var self = this
			, _element;


		self.languages = [];
		self.selectedLanguages = [];


		self.init = function( el ) {
			_element = el;
			self.getLanguages();
		};



		/**
		* Click handler
		*/
		self.toggleLanguage = function( ev, lang ) {

			if( ev && ev.originalEvent && ev.originalEvent instanceof Event ) {
				ev.preventDefault();
			}

			// Only one language may be selected
			if( !self.isMultiSelect ) {
				self.selectedLanguages = [ lang ];
				return;
			}


			// Don't untoggle last language
			if( self.selectedLanguages.length === 1 && self.selectedLanguages[ 0 ].id === lang.id ) {
				return;
			}

			// Add/remove language to self.selectedLanguages

			// Is language already selected? Strangely we cannot use indexOf – language objects change somehow.
			var isSelected = false;
			self.selectedLanguages.some( function( item, index ) {
				if( item.id === lang.id ) {
					isSelected = index;
					return true;
				}
			} );

			if( isSelected !== false ) {
				self.selectedLanguages.splice( isSelected, 1 );
			}
			else {
				self.selectedLanguages.push( lang );
			}

		};




		/**
		* Returns true if language is selected. 
		*/
		self.isSelected = function( language ) {

			var selected = false;
			self.selectedLanguages.some( function( item ) {
				if( language.id === item.id ) {
					selected = true;
					return true;
				}
			} );

			return selected;

		};



		/**
		* Returns the languages that the current website supports. 
		* They need to be stored (on login) in localStorage in the form of
		* [ {
		*		id: 2
		*		, code: 'it'
		*		, name: 'Italian'
		* } ]
		*/
		self.getLanguages = function() {

			var languages = SessionService.get( 'supported-languages', 'local' );
			console.log( 'languageMenuComponent: Got languages %o', languages );

			if( !languages ) {
				console.error( 'LanguageMenuComponentController: supported-languages cannot be retrieved from Session' );
				return;
			}

			languages.forEach( function( language ) {

				self.languages.push( {
					id			: language.language.id
					, code		: language.language.code
				} );

				// Select first language
				if( self.selectedLanguages.length === 0 ) {
					self.toggleLanguage( null, self.languages[ 0 ] );
				}

				console.log( 'LanguageMenuComponentController: supported languages are %o, selected is %o', self.languages, self.selectedLanguages );

			} );

		};




		self.checkForTranslation = function( languageId ) {

			if( !self.hasTranslation || !angular.isFunction( self.hasTranslation ) ) {
				console.warn( 'LanguageMenuComponentController: No hasTranslation function was passed' );
			}

			return self.hasTranslation( { 'languageId': languageId } );
		
		};




	} ] )

	.run( [ '$templateCache', function( $templateCache ) {

		$templateCache.put( 'languageMenuComponentTemplate.html',
			'<ul class=\'nav nav-tabs\'>' +
				'<li data-ng-repeat=\'lang in languageMenuComponent.languages\' data-ng-class=\'{active:languageMenuComponent.isSelected(lang)}\'>' +
					'<a href=\'#\' data-ng-click=\'languageMenuComponent.toggleLanguage( $event, lang )\'>' +
						'{{lang.code|uppercase}}' +
						'<span data-ng-if=\'languageMenuComponent.checkForTranslation(lang.id)\' class=\'fa fa-check\'></span>' +
					'</a>' +
				'</li>' +
			'</ul>'
		);


	} ] );
	

} )();


/*https://raw.githubusercontent.com/dbushell/Nestable/master/jquery.nestable.js*/
/*!
 * Nestable jQuery Plugin - Copyright (c) 2012 David Bushell - http://dbushell.com/
 * Dual-licensed under the BSD or MIT licenses
 */
;(function($, window, document, undefined)
{
    var hasTouch = 'ontouchstart' in document;

    /**
     * Detect CSS pointer-events property
     * events are normally disabled on the dragging element to avoid conflicts
     * https://github.com/ausi/Feature-detection-technique-for-pointer-events/blob/master/modernizr-pointerevents.js
     */
    var hasPointerEvents = (function()
    {
        var el    = document.createElement('div'),
            docEl = document.documentElement;
        if (!('pointerEvents' in el.style)) {
            return false;
        }
        el.style.pointerEvents = 'auto';
        el.style.pointerEvents = 'x';
        docEl.appendChild(el);
        var supports = window.getComputedStyle && window.getComputedStyle(el, '').pointerEvents === 'auto';
        docEl.removeChild(el);
        return !!supports;
    })();

    var defaults = {
            listNodeName    : 'ol',
            itemNodeName    : 'li',
            rootClass       : 'dd',
            listClass       : 'dd-list',
            itemClass       : 'dd-item',
            dragClass       : 'dd-dragel',
            handleClass     : 'dd-handle',
            collapsedClass  : 'dd-collapsed',
            placeClass      : 'dd-placeholder',
            noDragClass     : 'dd-nodrag',
            emptyClass      : 'dd-empty',
            expandBtnHTML   : '<button data-action="expand" type="button">Expand</button>',
            collapseBtnHTML : '<button data-action="collapse" type="button">Collapse</button>',
            group           : 0,
            maxDepth        : 5,
            threshold       : 20
        };

    function Plugin(element, options)
    {
        this.w  = $(document);
        this.el = $(element);
        this.options = $.extend({}, defaults, options);
        this.init();
    }

    Plugin.prototype = {

        init: function()
        {
            var list = this;

            list.reset();

            list.el.data('nestable-group', this.options.group);

            list.placeEl = $('<div class="' + list.options.placeClass + '"/>');

            $.each(this.el.find(list.options.itemNodeName), function(k, el) {
                list.setParent($(el));
            });

            list.el.on('click', 'button', function(e) {
                if (list.dragEl) {
                    return;
                }
                var target = $(e.currentTarget),
                    action = target.data('action'),
                    item   = target.parent(list.options.itemNodeName);
                if (action === 'collapse') {
                    list.collapseItem(item);
                }
                if (action === 'expand') {
                    list.expandItem(item);
                }
            });

            var onStartEvent = function(e)
            {
                var handle = $(e.target);
                if (!handle.hasClass(list.options.handleClass)) {
                    if (handle.closest('.' + list.options.noDragClass).length) {
                        return;
                    }
                    handle = handle.closest('.' + list.options.handleClass);
                }

                if (!handle.length || list.dragEl) {
                    return;
                }

                list.isTouch = /^touch/.test(e.type);
                if (list.isTouch && e.touches.length !== 1) {
                    return;
                }

                e.preventDefault();
                list.dragStart(e.touches ? e.touches[0] : e);
            };

            var onMoveEvent = function(e)
            {
                if (list.dragEl) {
                    e.preventDefault();
                    list.dragMove(e.touches ? e.touches[0] : e);
                }
            };

            var onEndEvent = function(e)
            {
                if (list.dragEl) {
                    e.preventDefault();
                    list.dragStop(e.touches ? e.touches[0] : e);
                }
            };

            if (hasTouch) {
                list.el[0].addEventListener('touchstart', onStartEvent, false);
                window.addEventListener('touchmove', onMoveEvent, false);
                window.addEventListener('touchend', onEndEvent, false);
                window.addEventListener('touchcancel', onEndEvent, false);
            }

            list.el.on('mousedown', onStartEvent);
            list.w.on('mousemove', onMoveEvent);
            list.w.on('mouseup', onEndEvent);

        },

        serialize: function()
        {
            var data,
                depth = 0,
                list  = this,
                step  = function(level, depth)
                {
                    var array = [ ],
                        items = level.children(list.options.itemNodeName);
                    items.each(function()
                    {
                        var li   = $(this),
                            item = $.extend({}, li.data()),
                            sub  = li.children(list.options.listNodeName);
                        if (sub.length) {
                            item.children = step(sub, depth + 1);
                        }
                        array.push(item);
                    });
                    return array;
                };
            data = step(list.el.find(list.options.listNodeName).first(), depth);
            return data;
        },

        serialise: function()
        {
            return this.serialize();
        },

        reset: function()
        {
            this.mouse = {
                offsetX   : 0,
                offsetY   : 0,
                startX    : 0,
                startY    : 0,
                lastX     : 0,
                lastY     : 0,
                nowX      : 0,
                nowY      : 0,
                distX     : 0,
                distY     : 0,
                dirAx     : 0,
                dirX      : 0,
                dirY      : 0,
                lastDirX  : 0,
                lastDirY  : 0,
                distAxX   : 0,
                distAxY   : 0
            };
            this.isTouch    = false;
            this.moving     = false;
            this.dragEl     = null;
            this.dragRootEl = null;
            this.dragDepth  = 0;
            this.hasNewRoot = false;
            this.pointEl    = null;
        },

        expandItem: function(li)
        {
            li.removeClass(this.options.collapsedClass);
            li.children('[data-action="expand"]').hide();
            li.children('[data-action="collapse"]').show();
            li.children(this.options.listNodeName).show();
        },

        collapseItem: function(li)
        {
            var lists = li.children(this.options.listNodeName);
            if (lists.length) {
                li.addClass(this.options.collapsedClass);
                li.children('[data-action="collapse"]').hide();
                li.children('[data-action="expand"]').show();
                li.children(this.options.listNodeName).hide();
            }
        },

        expandAll: function()
        {
            var list = this;
            list.el.find(list.options.itemNodeName).each(function() {
                list.expandItem($(this));
            });
        },

        collapseAll: function()
        {
            var list = this;
            list.el.find(list.options.itemNodeName).each(function() {
                list.collapseItem($(this));
            });
        },

        setParent: function(li)
        {
            if (li.children(this.options.listNodeName).length) {
                li.prepend($(this.options.expandBtnHTML));
                li.prepend($(this.options.collapseBtnHTML));
            }
            li.children('[data-action="expand"]').hide();
        },

        unsetParent: function(li)
        {
            li.removeClass(this.options.collapsedClass);
            li.children('[data-action]').remove();
            li.children(this.options.listNodeName).remove();
        },

        dragStart: function(e)
        {
            var mouse    = this.mouse,
                target   = $(e.target),
                dragItem = target.closest(this.options.itemNodeName);

            this.placeEl.css('height', dragItem.height());

            mouse.offsetX = e.offsetX !== undefined ? e.offsetX : e.pageX - target.offset().left;
            mouse.offsetY = e.offsetY !== undefined ? e.offsetY : e.pageY - target.offset().top;
            mouse.startX = mouse.lastX = e.pageX;
            mouse.startY = mouse.lastY = e.pageY;

            this.dragRootEl = this.el;

            this.dragEl = $(document.createElement(this.options.listNodeName)).addClass(this.options.listClass + ' ' + this.options.dragClass);
            this.dragEl.css('width', dragItem.width());

            dragItem.after(this.placeEl);
            dragItem[0].parentNode.removeChild(dragItem[0]);
            dragItem.appendTo(this.dragEl);

            $(document.body).append(this.dragEl);
            this.dragEl.css({
                'left' : e.pageX - mouse.offsetX,
                'top'  : e.pageY - mouse.offsetY
            });
            // total depth of dragging item
            var i, depth,
                items = this.dragEl.find(this.options.itemNodeName);
            for (i = 0; i < items.length; i++) {
                depth = $(items[i]).parents(this.options.listNodeName).length;
                if (depth > this.dragDepth) {
                    this.dragDepth = depth;
                }
            }
        },

        dragStop: function(e)
        {
            var el = this.dragEl.children(this.options.itemNodeName).first();
            el[0].parentNode.removeChild(el[0]);
            this.placeEl.replaceWith(el);

            this.dragEl.remove();
            this.el.trigger('change');
            if (this.hasNewRoot) {
                this.dragRootEl.trigger('change');
            }
            this.reset();
        },

        dragMove: function(e)
        {
            var list, parent, prev, next, depth,
                opt   = this.options,
                mouse = this.mouse;

            this.dragEl.css({
                'left' : e.pageX - mouse.offsetX,
                'top'  : e.pageY - mouse.offsetY
            });

            // mouse position last events
            mouse.lastX = mouse.nowX;
            mouse.lastY = mouse.nowY;
            // mouse position this events
            mouse.nowX  = e.pageX;
            mouse.nowY  = e.pageY;
            // distance mouse moved between events
            mouse.distX = mouse.nowX - mouse.lastX;
            mouse.distY = mouse.nowY - mouse.lastY;
            // direction mouse was moving
            mouse.lastDirX = mouse.dirX;
            mouse.lastDirY = mouse.dirY;
            // direction mouse is now moving (on both axis)
            mouse.dirX = mouse.distX === 0 ? 0 : mouse.distX > 0 ? 1 : -1;
            mouse.dirY = mouse.distY === 0 ? 0 : mouse.distY > 0 ? 1 : -1;
            // axis mouse is now moving on
            var newAx   = Math.abs(mouse.distX) > Math.abs(mouse.distY) ? 1 : 0;

            // do nothing on first move
            if (!mouse.moving) {
                mouse.dirAx  = newAx;
                mouse.moving = true;
                return;
            }

            // calc distance moved on this axis (and direction)
            if (mouse.dirAx !== newAx) {
                mouse.distAxX = 0;
                mouse.distAxY = 0;
            } else {
                mouse.distAxX += Math.abs(mouse.distX);
                if (mouse.dirX !== 0 && mouse.dirX !== mouse.lastDirX) {
                    mouse.distAxX = 0;
                }
                mouse.distAxY += Math.abs(mouse.distY);
                if (mouse.dirY !== 0 && mouse.dirY !== mouse.lastDirY) {
                    mouse.distAxY = 0;
                }
            }
            mouse.dirAx = newAx;

            /**
             * move horizontal
             */
            if (mouse.dirAx && mouse.distAxX >= opt.threshold) {
                // reset move distance on x-axis for new phase
                mouse.distAxX = 0;
                prev = this.placeEl.prev(opt.itemNodeName);
                // increase horizontal level if previous sibling exists and is not collapsed
                if (mouse.distX > 0 && prev.length && !prev.hasClass(opt.collapsedClass)) {
                    // cannot increase level when item above is collapsed
                    list = prev.find(opt.listNodeName).last();
                    // check if depth limit has reached
                    depth = this.placeEl.parents(opt.listNodeName).length;
                    if (depth + this.dragDepth <= opt.maxDepth) {
                        // create new sub-level if one doesn't exist
                        if (!list.length) {
                            list = $('<' + opt.listNodeName + '/>').addClass(opt.listClass);
                            list.append(this.placeEl);
                            prev.append(list);
                            this.setParent(prev);
                        } else {
                            // else append to next level up
                            list = prev.children(opt.listNodeName).last();
                            list.append(this.placeEl);
                        }
                    }
                }
                // decrease horizontal level
                if (mouse.distX < 0) {
                    // we can't decrease a level if an item preceeds the current one
                    next = this.placeEl.next(opt.itemNodeName);
                    if (!next.length) {
                        parent = this.placeEl.parent();
                        this.placeEl.closest(opt.itemNodeName).after(this.placeEl);
                        if (!parent.children().length) {
                            this.unsetParent(parent.parent());
                        }
                    }
                }
            }

            var isEmpty = false;

            // find list item under cursor
            if (!hasPointerEvents) {
                this.dragEl[0].style.visibility = 'hidden';
            }
            this.pointEl = $(document.elementFromPoint(e.pageX - document.body.scrollLeft, e.pageY - (window.pageYOffset || document.documentElement.scrollTop)));
            if (!hasPointerEvents) {
                this.dragEl[0].style.visibility = 'visible';
            }
            if (this.pointEl.hasClass(opt.handleClass)) {
                this.pointEl = this.pointEl.parent(opt.itemNodeName);
            }
            if (this.pointEl.hasClass(opt.emptyClass)) {
                isEmpty = true;
            }
            else if (!this.pointEl.length || !this.pointEl.hasClass(opt.itemClass)) {
                return;
            }

            // find parent list of item under cursor
            var pointElRoot = this.pointEl.closest('.' + opt.rootClass),
                isNewRoot   = this.dragRootEl.data('nestable-id') !== pointElRoot.data('nestable-id');

            /**
             * move vertical
             */
            if (!mouse.dirAx || isNewRoot || isEmpty) {
                // check if groups match if dragging over new root
                if (isNewRoot && opt.group !== pointElRoot.data('nestable-group')) {
                    return;
                }
                // check depth limit
                depth = this.dragDepth - 1 + this.pointEl.parents(opt.listNodeName).length;
                if (depth > opt.maxDepth) {
                    return;
                }
                var before = e.pageY < (this.pointEl.offset().top + this.pointEl.height() / 2);
                    parent = this.placeEl.parent();
                // if empty create new list to replace empty placeholder
                if (isEmpty) {
                    list = $(document.createElement(opt.listNodeName)).addClass(opt.listClass);
                    list.append(this.placeEl);
                    this.pointEl.replaceWith(list);
                }
                else if (before) {
                    this.pointEl.before(this.placeEl);
                }
                else {
                    this.pointEl.after(this.placeEl);
                }
                if (!parent.children().length) {
                    this.unsetParent(parent.parent());
                }
                if (!this.dragRootEl.find(opt.itemNodeName).length) {
                    this.dragRootEl.append('<div class="' + opt.emptyClass + '"/>');
                }
                // parent root list has changed
                if (isNewRoot) {
                    this.dragRootEl = pointElRoot;
                    this.hasNewRoot = this.el[0] !== this.dragRootEl[0];
                }
            }
        }

    };

    $.fn.nestable = function(params)
    {
        var lists  = this,
            retval = this;

        lists.each(function()
        {
            var plugin = $(this).data("nestable");

            if (!plugin) {
                $(this).data("nestable", new Plugin(this, params));
                $(this).data("nestable-id", new Date().getTime());
            } else {
                if (typeof params === 'string' && typeof plugin[params] === 'function') {
                    retval = plugin[params]();
                }
            }
        });

        return retval || lists;
    };

})(window.jQuery || window.Zepto, window, document);