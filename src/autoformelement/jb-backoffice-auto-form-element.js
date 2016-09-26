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

