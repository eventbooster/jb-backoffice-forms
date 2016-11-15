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
     */

    /**
     * Directive for autoFormElements: Replaces itself with the corresponding input element
     * as soon as the detailView directive has gotten the necessary data (type, required etc.)
     * from the server through an options call
     */
    var   typeKey = 'jb.formAutoInputTypes'
        , _module = angular.module('jb.formComponents');

    _module.value(typeKey, {
          'text'    : 'text'
        , 'number'  : 'text'
        , 'string'  : 'text'
        , 'boolean' : 'checkbox'
        , 'datetime': 'date-time'
        , 'date'    : 'date-time'
    });

    _module.directive('jbFormAutoInput', ['$compile', function ($compile) {

        return {
              controllerAs      : '$ctrl'
            , bindToController  : true
            , restrict          : 'E'
            , link : {
                post: function (scope, element, attrs, ctrl) {
                    ctrl.init(scope, element, attrs);
                }
                , pre: function (scope, element, attrs, ctrl) {
                    ctrl.preLink(scope, element, attrs);
                }
            }
            , controller        : 'JBFormAutoInputController'
            , scope             : {
                  label :  '@'
            }
        };
    }]);

    function JBFormAutoInputController($scope, $attrs, $compile, fieldTypes, subcomponentsService) {

        this.$scope     = $scope;
        this.$attrs     = $attrs;
        this.$compile   = $compile;
        this.fieldTypes = fieldTypes;

        this.name       = $attrs.for;
        this.label      = this.name;

        this.subcomponentsService   = subcomponentsService;
        this.registry               = null;
    }

    JBFormAutoInputController.prototype.preLink = function (scope, element, attrs) {
        this.registry = this.subcomponentsService.registryFor(scope);
        this.registry.listen();
    };

    JBFormAutoInputController.prototype.init = function (scope, element, attrs) {
        this.element = element;
        this.registry.registerOptionsDataHandler(this.updateElement.bind(this));
        this.registry.registerYourself();
    };
    // @todo: share this functionality with all the other literal inputs
    JBFormAutoInputController.prototype.selectOptions = function(optionsData){
        var properties = (optionsData) ? optionsData.properties : optionsData;
        if(!properties || !properties.length) return;
        for( var i = 0; i < properties.length; i++ ) {
            if(properties[i].name == this.name) return properties[i];
        }
        return;
    };

    /**
     * @todo: switch into an error state if there is no spec or corresponding type
     * @todo: think about a more angularish version of this procedure, since it is super messy!
     * @param fieldSpec
     */
    JBFormAutoInputController.prototype.updateElement = function(fieldSpec){

            var   elementType
                , elementSpec = this.selectOptions(fieldSpec);

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
            // this is not cool!
            var newElement = angular.element('<div jb-form-' + dashedCasedElementType + '-input for="' + this.name + '" label="' + this.label + '"></div>');
            // @todo: not sure if we still need to prepend the new element when we actually just inject the registry
            this.element.replaceWith(newElement);
            this.registry.unregisterOptionsDataHandler(this.updateElement);
            this.$compile(newElement)(this.$scope);
            // now the registry should know all the subcomponents
            // delegate to the options data handlers of the components
            return this.registry.optionsDataHandler(fieldSpec);
    };

    _module.controller('JBFormAutoInputController', [
        '$scope',
        '$attrs',
        '$compile',
        typeKey,
        'JBFormComponentsService',
        JBFormAutoInputController ]);
})();

